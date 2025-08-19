import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, ArrowRight, Info, Calendar, Hash, FileText, Users, Coins, Globe } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CompareDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  comparisonData: any;
  onImport: (selectedFields: string[]) => void;
}

export function CompareDataModal({ isOpen, onClose, comparisonData, onImport }: CompareDataModalProps) {
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  
  if (!comparisonData) return null;
  
  const { your_data: yourData, iati_data: iatiData, comparison } = comparisonData;
  
  // Helper function to format the display value
  const formatValue = (value: any, field: string) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-gray-400 italic">Not set</span>;
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (field.includes('date') && value) {
      // Format dates nicely
      return new Date(value).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    }
    // For status codes, show both code and label
    if (field === 'activity_status' && value) {
      const statusLabels: Record<string, string> = {
        '1': 'Pipeline',
        '2': 'Implementation',
        '3': 'Finalisation',
        '4': 'Closed',
        '5': 'Cancelled',
        '6': 'Suspended'
      };
      return (
        <span>
          {statusLabels[value] || 'Unknown'} <span className="text-gray-500">({value})</span>
        </span>
      );
    }
    if (field === 'collaboration_type' && value) {
      const collabLabels: Record<string, string> = {
        '1': 'Bilateral',
        '2': 'Multilateral',
        '3': 'Bilateral, core contributions to NGOs',
        '4': 'Multilateral outflows',
        '6': 'Private sector outflows',
        '7': 'Bilateral, ex-post reporting on NGOs',
        '8': 'Bilateral, triangular co-operation'
      };
      return (
        <span>
          {collabLabels[value] || 'Unknown'} <span className="text-gray-500">({value})</span>
        </span>
      );
    }
    return String(value);
  };
  
  // Helper function to determine if values are different
  const isDifferent = (yourValue: any, iatiValue: any) => {
    if ((yourValue === null || yourValue === '' || yourValue === undefined) && 
        (iatiValue === null || iatiValue === '' || iatiValue === undefined)) {
      return false;
    }
    return yourValue !== iatiValue;
  };
  
  // Helper function to render field comparison with enhanced UI
  const renderFieldComparison = (field: string, label: string, icon?: React.ReactNode, description?: string) => {
    const yourValue = yourData[field];
    const iatiValue = iatiData[field];
    const isActuallyDifferent = isDifferent(yourValue, iatiValue);
    const hasIatiData = iatiValue !== null && iatiValue !== undefined && iatiValue !== '';
    const hasLocalData = yourValue !== null && yourValue !== undefined && yourValue !== '';

    return (
      <div key={field} className={`border rounded-lg p-4 ${isActuallyDifferent ? 'border-orange-200 bg-orange-50' : 'border-gray-200'} hover:shadow-sm transition-shadow`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id={field}
                checked={selectedFields.includes(field)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedFields([...selectedFields, field]);
                  } else {
                    setSelectedFields(selectedFields.filter(f => f !== field));
                  }
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                disabled={!hasIatiData}
              />
              <label htmlFor={field} className="flex items-center gap-2 cursor-pointer">
                {icon}
                <span className="font-medium text-gray-900">{label}</span>
              </label>
              {isActuallyDifferent && (
                <Badge variant="outline" className="text-orange-600 border-orange-600">
                  Different
                </Badge>
              )}
              {!hasLocalData && hasIatiData && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  New data
                </Badge>
              )}
            </div>
            {description && (
              <p className="text-sm text-gray-600 ml-6 mb-2">{description}</p>
            )}
            <div className="ml-6 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500 w-20">Your data:</span>
                <div className={`flex-1 ${hasLocalData ? 'font-medium' : ''}`}>
                  {formatValue(yourValue, field)}
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500 w-20">IATI data:</span>
                <div className={`flex-1 ${hasIatiData ? 'font-medium text-blue-600' : ''}`}>
                  {formatValue(iatiValue, field)}
                </div>
              </div>
            </div>
          </div>
          {isActuallyDifferent && hasIatiData && (
            <ArrowRight className="h-5 w-5 text-orange-500 mt-6" />
          )}
        </div>
      </div>
    );
  };

  // Helper function to render array comparison with details
  const renderArrayComparison = (field: string, label: string, icon?: React.ReactNode) => {
    const yourArray = yourData[field] || [];
    const iatiArray = iatiData[field] || [];
    const isDiff = yourArray.length !== iatiArray.length || iatiArray.length > 0;

    return (
      <div key={field} className={`border rounded-lg p-4 ${isDiff && iatiArray.length > 0 ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id={field}
                checked={selectedFields.includes(field)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedFields([...selectedFields, field]);
                  } else {
                    setSelectedFields(selectedFields.filter(f => f !== field));
                  }
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                disabled={iatiArray.length === 0}
              />
              <label htmlFor={field} className="flex items-center gap-2 cursor-pointer">
                {icon}
                <span className="font-medium text-gray-900">{label}</span>
              </label>
              <Badge variant="outline">
                {yourArray.length} → {iatiArray.length} items
              </Badge>
            </div>
            
            {/* Show details for arrays */}
            {field === 'sectors' && iatiArray.length > 0 && (
              <div className="ml-6 mt-3 space-y-2">
                <p className="text-sm text-gray-600 mb-2">IATI sectors to import:</p>
                <div className="bg-white rounded p-3 space-y-1">
                  {iatiArray.map((sector: any, idx: number) => (
                    <div key={idx} className="text-sm flex items-center justify-between">
                      <span>
                        <span className="font-medium">{sector.code}</span> - {sector.name}
                      </span>
                      <Badge variant="secondary">{sector.percentage}%</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {field === 'participating_orgs' && iatiArray.length > 0 && (
              <div className="ml-6 mt-3 space-y-2">
                <p className="text-sm text-gray-600 mb-2">IATI organizations to import:</p>
                <div className="bg-white rounded p-3 space-y-1">
                  {iatiArray.map((org: any, idx: number) => (
                    <div key={idx} className="text-sm flex items-center justify-between">
                      <span className="font-medium">{org.name || org.ref}</span>
                      <Badge variant="secondary">{org.roleLabel}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {field === 'transactions' && (
              <div className="ml-6 mt-3">
                <p className="text-sm text-gray-600">
                  {iatiArray.length > 0 
                    ? `${iatiArray.length} transactions available from IATI`
                    : 'No transactions available from IATI'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedFields([]);
    } else {
      // Select all fields that have IATI data
      const allFields = [
        'title_narrative',
        'description_narrative',
        'activity_status',
        'activity_date_start_planned',
        'activity_date_start_actual',
        'activity_date_end_planned',
        'activity_date_end_actual',
        'default_aid_type',
        'flow_type',
        'collaboration_type',
        'default_finance_type',
        'sectors',
        'participating_orgs',
        'transactions'
      ].filter(field => {
        const value = iatiData[field];
        return value !== null && value !== undefined && value !== '' && 
               (Array.isArray(value) ? value.length > 0 : true);
      });
      setSelectedFields(allFields);
    }
    setSelectAll(!selectAll);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-xl">IATI Data Comparison</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 max-h-[calc(90vh-8rem)]">
          <div className="p-6 space-y-4">
            {comparison.iati_error ? (
              comparison.iati_error.includes('demo mode') ? (
                <Alert className="border-blue-200 bg-blue-50">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <strong>Demo Mode:</strong> {comparison.iati_error}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Error fetching IATI data: {comparison.iati_error}
                  </AlertDescription>
                </Alert>
              )
            ) : (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Successfully fetched IATI data for activity <span className="font-mono font-semibold">{iatiData.iati_identifier}</span>
                </AlertDescription>
              </Alert>
            )}
            
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Select the fields you want to import from IATI. Fields with differences or new data are highlighted.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectAll ? 'Deselect All' : 'Select All Available'}
              </Button>
            </div>
            
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="dates">Dates & Status</TabsTrigger>
                <TabsTrigger value="classifications">Classifications</TabsTrigger>
                <TabsTrigger value="relationships">Organizations & Finance</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-3 mt-4">
                {renderFieldComparison('title_narrative', 'Activity Title', <FileText className="h-4 w-4" />, 'The main title of the activity')}
                {renderFieldComparison('description_narrative', 'Activity Description', <FileText className="h-4 w-4" />, 'Detailed description of what the activity aims to achieve')}
              </TabsContent>
              
              <TabsContent value="dates" className="space-y-3 mt-4">
                {renderFieldComparison('activity_status', 'Activity Status', <Info className="h-4 w-4" />, 'Current implementation status of the activity')}
                {renderFieldComparison('activity_date_start_planned', 'Planned Start Date', <Calendar className="h-4 w-4" />)}
                {renderFieldComparison('activity_date_start_actual', 'Actual Start Date', <Calendar className="h-4 w-4" />)}
                {renderFieldComparison('activity_date_end_planned', 'Planned End Date', <Calendar className="h-4 w-4" />)}
                {renderFieldComparison('activity_date_end_actual', 'Actual End Date', <Calendar className="h-4 w-4" />)}
              </TabsContent>
              
              <TabsContent value="classifications" className="space-y-3 mt-4">
                {renderFieldComparison('default_aid_type', 'Default Aid Type', <Hash className="h-4 w-4" />, 'The type of aid being provided')}
                {renderFieldComparison('flow_type', 'Flow Type', <Hash className="h-4 w-4" />, 'The flow of aid resources')}
                {renderFieldComparison('collaboration_type', 'Collaboration Type', <Users className="h-4 w-4" />, 'The type of collaboration')}
                {renderFieldComparison('default_finance_type', 'Default Finance Type', <Coins className="h-4 w-4" />, 'The default type of finance')}
                {renderArrayComparison('sectors', 'Sector Allocations', <Globe className="h-4 w-4" />)}
              </TabsContent>
              
              <TabsContent value="relationships" className="space-y-3 mt-4">
                {renderArrayComparison('participating_orgs', 'Participating Organizations', <Users className="h-4 w-4" />)}
                {renderArrayComparison('transactions', 'Financial Transactions', <Coins className="h-4 w-4" />)}
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
        
        <div className="border-t px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedFields.length === 0 ? (
                'No fields selected'
              ) : (
                <span>
                  <span className="font-semibold text-gray-900">{selectedFields.length}</span> field{selectedFields.length !== 1 ? 's' : ''} selected for import
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  onImport(selectedFields);
                  onClose();
                }}
                disabled={selectedFields.length === 0}
              >
                Import Selected Fields
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 