import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CheckCircle, XCircle, AlertTriangle, MinusCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface ImportResultsDisplayProps {
  importSummary: any;
}

export function ImportResultsDisplay({ importSummary }: ImportResultsDisplayProps) {
  if (!importSummary) return null;

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
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'partial':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'empty':
        return <MinusCircle className="h-4 w-4 text-gray-400" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (successful: number, attempted: number, failed: number = 0, skipped: number = 0) => {
    if (attempted === 0) {
      return <Badge variant="outline" className="bg-gray-100">Not imported</Badge>;
    }
    if (failed > 0) {
      return <Badge variant="destructive"><span className="font-mono bg-gray-100 px-1 rounded">{successful}/{attempted}</span> ({failed} failed)</Badge>;
    }
    if (skipped > 0) {
      return <Badge variant="outline" className="bg-yellow-100"><span className="font-mono bg-gray-100 px-1 rounded">{successful}/{attempted}</span> ({skipped} skipped)</Badge>;
    }
    return <Badge variant="outline" className="bg-green-100"><span className="font-mono bg-gray-100 px-1 rounded">{successful}/{attempted}</span></Badge>;
  };

  const renderSection = (title: string, section: any, icon: React.ReactNode) => {
    const status = getSectionStatus(section);
    if (status === 'empty' && (!section?.details?.length && !section?.list?.length && !section?.failures?.length)) {
      return null;
    }

    return (
      <AccordionItem value={title} className="border rounded-lg mb-2 px-4">
        <AccordionTrigger className="hover:no-underline py-4">
          <div className="flex items-center justify-between w-full pr-4">
            <div className="flex items-center gap-3">
              {getStatusIcon(status)}
              <span className="font-medium">{title}</span>
            </div>
            {getStatusBadge(
              section?.successful || 0, 
              section?.attempted || 0, 
              section?.failed || 0,
              section?.skipped || 0
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="pt-2 pb-4">
          <div className="space-y-4">
            {/* Summary Stats */}
            {section?.attempted > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 p-3 rounded-md">
                <div>
                  <div className="text-xs text-gray-500">Attempted</div>
                  <div className="text-lg font-semibold">{section.attempted}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Successful</div>
                  <div className="text-lg font-semibold text-green-600">{section.successful}</div>
                </div>
                {section.failed > 0 && (
                  <div>
                    <div className="text-xs text-gray-500">Failed</div>
                    <div className="text-lg font-semibold text-red-600">{section.failed}</div>
                  </div>
                )}
                {section.skipped > 0 && (
                  <div>
                    <div className="text-xs text-gray-500">Skipped</div>
                    <div className="text-lg font-semibold text-gray-600">{section.skipped}</div>
                  </div>
                )}
              </div>
            )}

            {/* Additional Stats */}
            {section?.totalAmount !== undefined && section.totalAmount > 0 && (
              <div className="bg-blue-50 p-3 rounded-md">
                <div className="text-xs text-blue-600">Total Amount</div>
                <div className="text-lg font-semibold text-blue-900">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(section.totalAmount)}
                </div>
              </div>
            )}

            {section?.totalPercentage !== undefined && section.totalPercentage > 0 && (
              <div className="bg-blue-50 p-3 rounded-md">
                <div className="text-xs text-blue-600">Total Percentage</div>
                <div className="text-lg font-semibold text-blue-900">{section.totalPercentage.toFixed(2)}%</div>
              </div>
            )}

            {/* Success Details */}
            {section?.details && section.details.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-green-700 mb-2">Successfully Imported ({section.details.length})</h4>
                <div className="bg-green-50 border border-green-200 rounded-md p-3 max-h-60 overflow-y-auto">
                  <div className="space-y-2 text-xs font-mono">
                    {section.details.slice(0, 50).map((detail: any, idx: number) => (
                      <div key={idx} className="border-b border-green-100 pb-1">
                        {typeof detail === 'string' ? detail : JSON.stringify(detail, null, 2)}
                      </div>
                    ))}
                    {section.details.length > 50 && (
                      <div className="text-gray-500 italic">... and {section.details.length - 50} more</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* List Items (for sectors, locations, etc.) */}
            {section?.list && section.list.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-green-700 mb-2">Imported Items ({section.list.length})</h4>
                <div className="bg-green-50 border border-green-200 rounded-md p-3 max-h-60 overflow-y-auto">
                  <div className="space-y-2 text-xs">
                    {section.list.slice(0, 50).map((item: any, idx: number) => (
                      <div key={idx} className="border-b border-green-100 pb-2">
                        {item.name && <div className="font-medium">{item.name}</div>}
                        {item.code && <div className="text-gray-600">Code: {item.code}</div>}
                        {item.percentage !== undefined && <div className="text-gray-600">Percentage: {item.percentage}%</div>}
                        {item.significance !== undefined && <div className="text-gray-600">Significance: {item.significance}</div>}
                        {item.value !== undefined && <div className="text-gray-600">Value: {item.value}</div>}
                      </div>
                    ))}
                    {section.list.length > 50 && (
                      <div className="text-gray-500 italic">... and {section.list.length - 50} more</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Failures */}
            {section?.failures && section.failures.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-red-700 mb-2">Failed Items ({section.failures.length})</h4>
                <div className="bg-red-50 border border-red-200 rounded-md p-3 max-h-60 overflow-y-auto">
                  <div className="space-y-3 text-xs">
                    {section.failures.map((failure: any, idx: number) => (
                      <div key={idx} className="border-b border-red-100 pb-2">
                        {failure.code && <div className="font-medium text-red-900">Code: {failure.code}</div>}
                        {failure.name && <div className="font-medium text-red-900">Name: {failure.name}</div>}
                        {failure.vocabulary && <div className="text-gray-700">Vocabulary: {failure.vocabulary}</div>}
                        {failure.reason && (
                          <div className="mt-1 text-red-700 bg-red-100 p-2 rounded">
                            <span className="font-semibold">Reason: </span>{failure.reason}
                          </div>
                        )}
                        {failure.error && (
                          <div className="mt-1 text-red-700 bg-red-100 p-2 rounded">
                            <span className="font-semibold">Error: </span>{failure.error}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Warnings */}
            {section?.warnings && section.warnings.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-yellow-700 mb-2">Warnings ({section.warnings.length})</h4>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 max-h-40 overflow-y-auto">
                  <ul className="space-y-1 text-xs list-disc list-inside">
                    {section.warnings.map((warning: string, idx: number) => (
                      <li key={idx} className="text-yellow-900">{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Matching Details (for policy markers) */}
            {section?.matchingDetails && section.matchingDetails.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-blue-700 mb-2">Matching Details ({section.matchingDetails.length})</h4>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 max-h-60 overflow-y-auto">
                  <div className="space-y-3 text-xs">
                    {section.matchingDetails.map((detail: any, idx: number) => (
                      <div key={idx} className="border-b border-blue-100 pb-2">
                        <div className="font-medium text-blue-900">
                          Code: {detail.code} {detail.name && `(${detail.name})`}
                        </div>
                        {detail.matchedTo && (
                          <div className="text-gray-700">Matched To: {detail.matchedTo}</div>
                        )}
                        {detail.matchingStrategy && (
                          <div className="text-gray-700">Strategy: {detail.matchingStrategy}</div>
                        )}
                        {detail.reason && (
                          <div className="mt-1 text-blue-700 italic">{detail.reason}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Validation Issues */}
            {section?.validationIssues && section.validationIssues.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-orange-700 mb-2">Validation Issues ({section.validationIssues.length})</h4>
                <div className="bg-orange-50 border border-orange-200 rounded-md p-3 max-h-40 overflow-y-auto">
                  <ul className="space-y-1 text-xs list-disc list-inside">
                    {section.validationIssues.map((issue: string, idx: number) => (
                      <li key={idx} className="text-orange-900">{issue}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Detailed Import Results</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {/* Basic Fields */}
            {importSummary.basicFields && importSummary.basicFields.length > 0 && (
              <AccordionItem value="basic-fields" className="border rounded-lg mb-2 px-4">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Basic Fields</span>
                    </div>
                    <Badge variant="outline" className="bg-green-100">{importSummary.basicFields.length} fields</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4">
                  <div className="bg-green-50 border border-green-200 rounded-md p-3 max-h-60 overflow-y-auto">
                    <div className="space-y-2 text-xs">
                      {importSummary.basicFields.map((field: any, idx: number) => (
                        <div key={idx} className="border-b border-green-100 pb-2">
                          <div className="font-medium">{field.field}</div>
                          <div className="text-gray-600 truncate">{String(field.value).substring(0, 100)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Transactions */}
            {renderSection('Transactions', importSummary.transactions, <CheckCircle />)}
            
            {/* Budgets */}
            {renderSection('Budgets', importSummary.budgets, <CheckCircle />)}
            
            {/* Planned Disbursements */}
            {renderSection('Planned Disbursements', importSummary.plannedDisbursements, <CheckCircle />)}
            
            {/* Sectors */}
            {renderSection('Sectors', importSummary.sectors, <CheckCircle />)}
            
            {/* Locations */}
            {renderSection('Locations', importSummary.locations, <CheckCircle />)}
            
            {/* Policy Markers */}
            {renderSection('Policy Markers', importSummary.policyMarkers, <CheckCircle />)}
            
            {/* Financing Terms (CRS) */}
            {renderSection('Financing Terms (CRS)', importSummary.financingTerms, <CheckCircle />)}
            
            {/* Tags */}
            {renderSection('Tags', importSummary.tags, <CheckCircle />)}
            
            {/* Results */}
            {renderSection('Results Framework', importSummary.results, <CheckCircle />)}
            
            {/* Document Links */}
            {renderSection('Document Links', importSummary.documentLinks, <CheckCircle />)}
            
            {/* Conditions */}
            {renderSection('Conditions', importSummary.conditions, <CheckCircle />)}
            
            {/* Humanitarian Scopes */}
            {renderSection('Humanitarian Scopes', importSummary.humanitarianScopes, <CheckCircle />)}
            
            {/* Contacts */}
            {renderSection('Contacts', importSummary.contacts, <CheckCircle />)}
            
            {/* Participating Organizations */}
            {renderSection('Participating Organizations', importSummary.participatingOrgs, <CheckCircle />)}
            
            {/* Other Identifiers */}
            {renderSection('Other Identifiers', importSummary.otherIdentifiers, <CheckCircle />)}
            
            {/* Related Activities */}
            {importSummary.relatedActivities && (importSummary.relatedActivities.attempted > 0 || importSummary.relatedActivities.missing?.length > 0) && (
              <AccordionItem value="Related Activities" className="border rounded-lg mb-2 px-4">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(getSectionStatus(importSummary.relatedActivities))}
                      <span className="font-medium">Related Activities</span>
                    </div>
                    {getStatusBadge(
                      importSummary.relatedActivities.successful || 0, 
                      importSummary.relatedActivities.attempted || 0, 
                      importSummary.relatedActivities.failed || 0,
                      importSummary.relatedActivities.skipped || 0
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4">
                  <div className="space-y-4">
                    {/* Summary Stats */}
                    {importSummary.relatedActivities.attempted > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 p-3 rounded-md">
                        <div>
                          <div className="text-xs text-gray-500">Attempted</div>
                          <div className="text-lg font-semibold">{importSummary.relatedActivities.attempted}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Successful</div>
                          <div className="text-lg font-semibold text-green-600">{importSummary.relatedActivities.successful}</div>
                        </div>
                        {importSummary.relatedActivities.skipped > 0 && (
                          <div>
                            <div className="text-xs text-gray-500">Skipped</div>
                            <div className="text-lg font-semibold text-yellow-600">{importSummary.relatedActivities.skipped}</div>
                          </div>
                        )}
                        {importSummary.relatedActivities.failed > 0 && (
                          <div>
                            <div className="text-xs text-gray-500">Failed</div>
                            <div className="text-lg font-semibold text-red-600">{importSummary.relatedActivities.failed}</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Successfully Linked Activities */}
                    {importSummary.relatedActivities.details && importSummary.relatedActivities.details.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-green-700 mb-2">Successfully Linked ({importSummary.relatedActivities.details.length})</h4>
                        <div className="bg-green-50 border border-green-200 rounded-md p-3 max-h-40 overflow-y-auto">
                          <div className="space-y-2 text-xs">
                            {importSummary.relatedActivities.details.map((detail: any, idx: number) => (
                              <div key={idx} className="border-b border-green-100 pb-2">
                                <div className="font-medium">{detail.ref}</div>
                                <div className="text-gray-600">Type: {detail.relationshipTypeLabel || detail.type}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Missing Activities (Not Found in Database) */}
                    {importSummary.relatedActivities.missing && importSummary.relatedActivities.missing.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-yellow-700 mb-2">Not Found in Database ({importSummary.relatedActivities.missing.length})</h4>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                          <p className="text-xs text-yellow-900 mb-3">
                            These related activities were referenced in the XML but don't exist in your database yet. Import them first to create the relationships.
                          </p>
                          <div className="space-y-2">
                            {importSummary.relatedActivities.missing.map((missing: any, idx: number) => (
                              <div key={idx} className="bg-white border border-yellow-300 rounded p-2 text-xs">
                                <div className="font-medium text-gray-900">IATI ID: {missing.ref}</div>
                                <div className="text-gray-600">Relationship: {missing.relationshipTypeLabel || missing.type}</div>
                                <div className="mt-2 text-yellow-700 italic">
                                  💡 Import this activity first, then re-import this activity to create the link
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Failures */}
                    {importSummary.relatedActivities.failures && importSummary.relatedActivities.failures.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-red-700 mb-2">Failed ({importSummary.relatedActivities.failures.length})</h4>
                        <div className="bg-red-50 border border-red-200 rounded-md p-3 max-h-40 overflow-y-auto">
                          <div className="space-y-3 text-xs">
                            {importSummary.relatedActivities.failures.map((failure: any, idx: number) => (
                              <div key={idx} className="border-b border-red-100 pb-2">
                                <div className="font-medium text-red-900">Ref: {failure.ref}</div>
                                {failure.error && (
                                  <div className="mt-1 text-red-700 bg-red-100 p-2 rounded">
                                    <span className="font-semibold">Error: </span>{failure.error}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Warnings */}
                    {importSummary.relatedActivities.warnings && importSummary.relatedActivities.warnings.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-yellow-700 mb-2">Warnings ({importSummary.relatedActivities.warnings.length})</h4>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 max-h-40 overflow-y-auto">
                          <ul className="space-y-1 text-xs list-disc list-inside">
                            {importSummary.relatedActivities.warnings.map((warning: string, idx: number) => (
                              <li key={idx} className="text-yellow-900">{warning}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
            
            {/* Forward Spending Survey */}
            {renderSection('Forward Spending Survey (FSS)', importSummary.fss, <CheckCircle />)}

            {/* Recipient Countries */}
            {renderSection('Recipient Countries', importSummary.recipientCountries, <CheckCircle />)}
            
            {/* Recipient Regions */}
            {renderSection('Recipient Regions', importSummary.recipientRegions, <CheckCircle />)}
            
            {/* Custom Geographies */}
            {renderSection('Custom Geographies', importSummary.customGeographies, <CheckCircle />)}

            {/* Errors */}
            {importSummary.errors && importSummary.errors.length > 0 && (
              <AccordionItem value="errors" className="border rounded-lg mb-2 px-4 border-red-300">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span className="font-medium text-red-700">Errors</span>
                    </div>
                    <Badge variant="destructive">{importSummary.errors.length} errors</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4">
                  <div className="bg-red-50 border border-red-200 rounded-md p-3 max-h-60 overflow-y-auto">
                    <ul className="space-y-2 text-xs list-decimal list-inside">
                      {importSummary.errors.map((error: string, idx: number) => (
                        <li key={idx} className="text-red-900">{error}</li>
                      ))}
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Warnings */}
            {importSummary.warnings && importSummary.warnings.length > 0 && (
              <AccordionItem value="warnings" className="border rounded-lg mb-2 px-4 border-yellow-300">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="font-medium text-yellow-700">Warnings</span>
                    </div>
                    <Badge variant="outline" className="bg-yellow-100">{importSummary.warnings.length} warnings</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 max-h-60 overflow-y-auto">
                    <ul className="space-y-2 text-xs list-decimal list-inside">
                      {importSummary.warnings.map((warning: string, idx: number) => (
                        <li key={idx} className="text-yellow-900">{warning}</li>
                      ))}
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Silent Failures */}
            {importSummary.silentFailures && importSummary.silentFailures.length > 0 && (
              <AccordionItem value="silent-failures" className="border rounded-lg mb-2 px-4 border-gray-300">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      <MinusCircle className="h-4 w-4 text-gray-600" />
                      <span className="font-medium text-gray-700">Silent Failures (Skipped)</span>
                    </div>
                    <Badge variant="outline" className="bg-gray-100">{importSummary.silentFailures.length} skipped</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-3 max-h-60 overflow-y-auto">
                    <ul className="space-y-2 text-xs list-decimal list-inside">
                      {importSummary.silentFailures.map((failure: string, idx: number) => (
                        <li key={idx} className="text-gray-700">{failure}</li>
                      ))}
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Validation Issues */}
            {importSummary.validationIssues && importSummary.validationIssues.length > 0 && (
              <AccordionItem value="validation-issues" className="border rounded-lg mb-2 px-4 border-orange-300">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <span className="font-medium text-orange-700">Validation Issues</span>
                    </div>
                    <Badge variant="outline" className="bg-orange-100">{importSummary.validationIssues.length} issues</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4">
                  <div className="bg-orange-50 border border-orange-200 rounded-md p-3 max-h-60 overflow-y-auto">
                    <ul className="space-y-2 text-xs list-decimal list-inside">
                      {importSummary.validationIssues.map((issue: string, idx: number) => (
                        <li key={idx} className="text-orange-900">{issue}</li>
                      ))}
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}

