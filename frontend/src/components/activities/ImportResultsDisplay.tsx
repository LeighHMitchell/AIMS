import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, MinusCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ImportResultsDisplayProps {
  importSummary: any;
}

export function ImportResultsDisplay({ importSummary }: ImportResultsDisplayProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState(false);

  if (!importSummary) return null;

  const toggleRow = (rowId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowId)) {
      newExpanded.delete(rowId);
    } else {
      newExpanded.add(rowId);
    }
    setExpandedRows(newExpanded);
  };

  // Expand all rows by default on first render
  useEffect(() => {
    if (!initialized && importSummary) {
      const allIds = new Set<string>();
      
      if (importSummary.basicFields?.length > 0) allIds.add('basic-fields');
      
      const standardSections = [
        'transactions', 'budgets', 'plannedDisbursements', 'sectors', 'locations',
        'policyMarkers', 'financingTerms', 'tags', 'results', 'documentLinks',
        'conditions', 'humanitarianScopes', 'contacts', 'participatingOrgs',
        'otherIdentifiers', 'relatedActivities', 'fss', 'recipientCountries',
        'recipientRegions', 'customGeographies'
      ];
      
      standardSections.forEach(id => {
        const section = importSummary[id];
        if (section && (section.attempted > 0 || section.details?.length > 0 || section.list?.length > 0)) {
          allIds.add(id);
        }
      });
      
      if (importSummary.errors?.length > 0) allIds.add('errors');
      if (importSummary.warnings?.length > 0) allIds.add('warnings');
      
      setExpandedRows(allIds);
      setInitialized(true);
    }
  }, [importSummary, initialized]);

  const getSectionStatus = (section: any) => {
    if (!section) return 'empty';
    const attempted = section.attempted || 0;
    const successful = section.successful || 0;
    const failed = section.failed || 0;
    
    if (attempted === 0) return 'empty';
    if (failed > 0) return 'partial';
    if (successful === attempted) return 'success';
    return 'partial';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-foreground" />;
      case 'partial':
        return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-foreground" />;
      case 'empty':
        return <MinusCircle className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getStatusBadgeClass = (successful: number, attempted: number, failed: number = 0) => {
    if (attempted === 0) return 'bg-muted text-muted-foreground';
    if (failed > 0) return 'bg-muted text-foreground';
    return 'bg-muted text-foreground';
  };

  const formatCount = (successful: number, attempted: number, failed: number = 0, skipped: number = 0) => {
    if (attempted === 0) return '-';
    let text = `${successful}/${attempted}`;
    if (failed > 0) text += ` (${failed} failed)`;
    if (skipped > 0) text += ` (${skipped} skipped)`;
    return text;
  };

  const hasDetails = (section: any) => {
    return section && (
      section.details?.length > 0 || 
      section.list?.length > 0 || 
      section.failures?.length > 0 ||
      section.warnings?.length > 0 ||
      section.matchingDetails?.length > 0 ||
      section.totalAmount > 0 ||
      section.totalPercentage > 0
    );
  };

  const renderExpandedDetails = (section: any, title: string) => {
    if (!section) return null;

    return (
      <div className="px-4 py-3 bg-muted border-t border-border space-y-3">
        {/* Additional Stats */}
        {((section?.totalAmount !== undefined && section.totalAmount > 0) || 
          (section?.totalPercentage !== undefined && section.totalPercentage > 0)) && (
          <table className="w-full text-sm border border-border rounded">
            <tbody>
              {section?.totalAmount !== undefined && section.totalAmount > 0 && (
                <tr className="border-b border-border">
                  <td className="px-3 py-2 font-medium text-muted-foreground bg-muted w-40">Total Amount</td>
                  <td className="px-3 py-2 text-foreground">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(section.totalAmount)}
                  </td>
                </tr>
              )}
              {section?.totalPercentage !== undefined && section.totalPercentage > 0 && (
                <tr>
                  <td className="px-3 py-2 font-medium text-muted-foreground bg-muted w-40">Total Percentage</td>
                  <td className="px-3 py-2 text-foreground">{section.totalPercentage.toFixed(2)}%</td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* Success Details - Table Format */}
        {section?.details && section.details.length > 0 && (
          <div>
            <div className="text-sm font-medium text-foreground mb-1">Successfully Imported ({section.details.length})</div>
            <div className="border border-border rounded overflow-hidden max-h-48 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-surface-muted sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-foreground border-b border-border">#</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground border-b border-border">Details</th>
                  </tr>
                </thead>
                <tbody className="bg-card">
                  {section.details.slice(0, 30).map((detail: any, idx: number) => (
                    <tr key={idx} className="border-b border-border last:border-0">
                      <td className="px-3 py-1.5 text-muted-foreground w-12">{idx + 1}</td>
                      <td className="px-3 py-1.5 font-mono text-foreground">
                        {typeof detail === 'string' ? detail : JSON.stringify(detail)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {section.details.length > 30 && (
                <div className="text-xs text-muted-foreground italic px-3 py-2 bg-muted border-t border-border">
                  ... and {section.details.length - 30} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* List Items - Table Format */}
        {section?.list && section.list.length > 0 && (
          <div>
            <div className="text-sm font-medium text-foreground mb-1">Imported Items ({section.list.length})</div>
            <div className="border border-border rounded overflow-hidden max-h-48 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-surface-muted sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-foreground border-b border-border">#</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground border-b border-border">Name</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground border-b border-border">Code</th>
                    <th className="px-3 py-2 text-right font-medium text-foreground border-b border-border">Value</th>
                  </tr>
                </thead>
                <tbody className="bg-card">
                  {section.list.slice(0, 30).map((item: any, idx: number) => (
                    <tr key={idx} className="border-b border-border last:border-0">
                      <td className="px-3 py-1.5 text-muted-foreground w-12">{idx + 1}</td>
                      <td className="px-3 py-1.5 font-medium text-foreground">{item.name || '-'}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{item.code || '-'}</td>
                      <td className="px-3 py-1.5 text-right text-muted-foreground">
                        {item.percentage !== undefined ? `${item.percentage}%` : 
                         item.significance !== undefined ? `Sig: ${item.significance}` :
                         item.value !== undefined ? item.value : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {section.list.length > 30 && (
                <div className="text-xs text-muted-foreground italic px-3 py-2 bg-muted border-t border-border">
                  ... and {section.list.length - 30} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Failures - Table Format */}
        {section?.failures && section.failures.length > 0 && (
          <div>
            <div className="text-sm font-medium text-foreground mb-1">Failed ({section.failures.length})</div>
            <div className="border border-border rounded overflow-hidden max-h-48 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-surface-muted sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-foreground border-b border-border">#</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground border-b border-border">Item</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground border-b border-border">Reason</th>
                  </tr>
                </thead>
                <tbody className="bg-card">
                  {section.failures.map((failure: any, idx: number) => (
                    <tr key={idx} className="border-b border-border last:border-0">
                      <td className="px-3 py-1.5 text-muted-foreground w-12">{idx + 1}</td>
                      <td className="px-3 py-1.5 font-medium text-foreground">
                        {failure.code || failure.name || '-'}
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground">
                        {failure.reason || failure.error || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Warnings - Table Format */}
        {section?.warnings && section.warnings.length > 0 && (
          <div>
            <div className="text-sm font-medium text-foreground mb-1">Warnings ({section.warnings.length})</div>
            <div className="border border-border rounded overflow-hidden max-h-48 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-surface-muted sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-foreground border-b border-border">#</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground border-b border-border">Warning</th>
                  </tr>
                </thead>
                <tbody className="bg-card">
                  {section.warnings.map((warning: string, idx: number) => (
                    <tr key={idx} className="border-b border-border last:border-0">
                      <td className="px-3 py-1.5 text-muted-foreground w-12">{idx + 1}</td>
                      <td className="px-3 py-1.5 text-foreground">{warning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Matching Details - Table Format */}
        {section?.matchingDetails && section.matchingDetails.length > 0 && (
          <div>
            <div className="text-sm font-medium text-foreground mb-1">Matching Details ({section.matchingDetails.length})</div>
            <div className="border border-border rounded overflow-hidden max-h-48 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-surface-muted sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-foreground border-b border-border">#</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground border-b border-border">Code</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground border-b border-border">Matched To</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground border-b border-border">Strategy</th>
                  </tr>
                </thead>
                <tbody className="bg-card">
                  {section.matchingDetails.map((detail: any, idx: number) => (
                    <tr key={idx} className="border-b border-border last:border-0">
                      <td className="px-3 py-1.5 text-muted-foreground w-12">{idx + 1}</td>
                      <td className="px-3 py-1.5 font-medium text-foreground">{detail.code}</td>
                      <td className="px-3 py-1.5 text-foreground">{detail.matchedTo || '-'}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{detail.matchingStrategy || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Build sections array for the table
  type SectionEntry = {
    id: string;
    title: string;
    section: any;
    isSpecial?: boolean;
  };

  const sections: SectionEntry[] = [];

  // Basic Fields
  if (importSummary.basicFields && importSummary.basicFields.length > 0) {
    sections.push({
      id: 'basic-fields',
      title: 'Basic Fields',
      section: { attempted: importSummary.basicFields.length, successful: importSummary.basicFields.length, failed: 0, list: importSummary.basicFields.map((f: any) => ({ name: f.field, code: String(f.value).substring(0, 50) })) }
    });
  }

  // Standard sections
  const standardSections: [string, string, any][] = [
    ['transactions', 'Transactions', importSummary.transactions],
    ['budgets', 'Budgets', importSummary.budgets],
    ['plannedDisbursements', 'Planned Disbursements', importSummary.plannedDisbursements],
    ['sectors', 'Sectors', importSummary.sectors],
    ['locations', 'Locations', importSummary.locations],
    ['policyMarkers', 'Policy Markers', importSummary.policyMarkers],
    ['financingTerms', 'Financing Terms (CRS)', importSummary.financingTerms],
    ['tags', 'Tags', importSummary.tags],
    ['results', 'Results Framework', importSummary.results],
    ['documentLinks', 'Document Links', importSummary.documentLinks],
    ['conditions', 'Conditions', importSummary.conditions],
    ['humanitarianScopes', 'Humanitarian Scopes', importSummary.humanitarianScopes],
    ['contacts', 'Contacts', importSummary.contacts],
    ['participatingOrgs', 'Participating Organizations', importSummary.participatingOrgs],
    ['otherIdentifiers', 'Other Identifiers', importSummary.otherIdentifiers],
    ['relatedActivities', 'Related Activities', importSummary.relatedActivities],
    ['fss', 'Forward Spending Survey (FSS)', importSummary.fss],
    ['recipientCountries', 'Recipient Countries', importSummary.recipientCountries],
    ['recipientRegions', 'Recipient Regions', importSummary.recipientRegions],
    ['customGeographies', 'Custom Geographies', importSummary.customGeographies],
  ];

  standardSections.forEach(([id, title, section]) => {
    const status = getSectionStatus(section);
    if (status !== 'empty' || hasDetails(section)) {
      sections.push({ id, title, section });
    }
  });

  // Error sections
  if (importSummary.errors && importSummary.errors.length > 0) {
    sections.push({
      id: 'errors',
      title: 'Errors',
      section: { attempted: importSummary.errors.length, successful: 0, failed: importSummary.errors.length, failures: importSummary.errors.map((e: string) => ({ reason: e })) },
      isSpecial: true
    });
  }

  if (importSummary.warnings && importSummary.warnings.length > 0) {
    sections.push({
      id: 'warnings',
      title: 'Warnings',
      section: { attempted: importSummary.warnings.length, successful: importSummary.warnings.length, failed: 0, warnings: importSummary.warnings },
      isSpecial: true
    });
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="bg-muted px-4 py-3 border-b border-border">
        <h3 className="text-lg font-semibold">Detailed Import Results</h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted border-b border-border">
            <TableHead className="w-8 border-r border-border"></TableHead>
            <TableHead className="w-8 border-r border-border">Status</TableHead>
            <TableHead className="border-r border-border">Category</TableHead>
            <TableHead className="text-right w-32">Result</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sections.map((item) => {
            const status = getSectionStatus(item.section);
            const isExpanded = expandedRows.has(item.id);
            const canExpand = hasDetails(item.section);

            return (
              <React.Fragment key={item.id}>
                <TableRow 
                  className={`border-b border-border ${canExpand ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                  onClick={() => canExpand && toggleRow(item.id)}
                >
                  <TableCell className="w-8 px-2 border-r border-border">
                    {canExpand && (
                      isExpanded 
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell className="w-8 border-r border-border">
                    {getStatusIcon(status)}
                  </TableCell>
                  <TableCell className="font-medium border-r border-border">
                    {item.title}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge 
                      variant="outline" 
                      className={getStatusBadgeClass(
                        item.section?.successful || 0,
                        item.section?.attempted || 0,
                        item.section?.failed || 0
                      )}
                    >
                      {formatCount(
                        item.section?.successful || 0,
                        item.section?.attempted || 0,
                        item.section?.failed || 0,
                        item.section?.skipped || 0
                      )}
                    </Badge>
                  </TableCell>
                </TableRow>
                {isExpanded && (
                  <TableRow>
                    <TableCell colSpan={4} className="p-0 border-b border-border">
                      {renderExpandedDetails(item.section, item.title)}
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

