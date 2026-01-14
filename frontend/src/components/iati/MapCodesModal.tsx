'use client';

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  AlertTriangle, 
  Hash, 
  CheckCircle, 
  Info,
  FileCode
} from 'lucide-react';

interface UnmappedCodes {
  [codeType: string]: string[];
}

interface CodeMapping {
  [codeType: string]: {
    [originalCode: string]: string;
  };
}

interface MapCodesModalProps {
  isOpen: boolean;
  onClose: () => void;
  unmappedCodes: UnmappedCodes;
  onComplete: (mappings: CodeMapping) => void;
}

// Valid system codes for each type (IATI Standard v2.03)
const SYSTEM_CODES = {
  transaction_type: [
    { value: '1', label: '1 - Incoming Funds' },
    { value: '2', label: '2 - Outgoing Commitment' },
    { value: '3', label: '3 - Disbursement' },
    { value: '4', label: '4 - Expenditure' },
    { value: '5', label: '5 - Interest Payment' },
    { value: '6', label: '6 - Loan Repayment' },
    { value: '7', label: '7 - Reimbursement' },
    { value: '8', label: '8 - Purchase of Equity' },
    { value: '9', label: '9 - Sale of Equity' },
    { value: '10', label: '10 - Credit Guarantee' },
    { value: '11', label: '11 - Incoming Commitment' },
    { value: '12', label: '12 - Outgoing Pledge' },
    { value: '13', label: '13 - Incoming Pledge' }
  ],
  flow_type: [
    { value: '10', label: '10 - ODA' },
    { value: '20', label: '20 - OOF' },
    { value: '21', label: '21 - Non-export credit OOF' },
    { value: '30', label: '30 - Private grants' },
    { value: '35', label: '35 - Private market' },
    { value: '40', label: '40 - Non flow' },
    { value: '50', label: '50 - Other flows' }
  ],
  finance_type: [
    { value: '110', label: '110 - Standard grant' },
    { value: '111', label: '111 - Subsidies to national private investors' },
    { value: '210', label: '210 - Interest subsidy' },
    { value: '310', label: '310 - Capital subscription on deposit basis' },
    { value: '311', label: '311 - Capital subscription on encashment basis' },
    { value: '410', label: '410 - Aid loan excluding debt reorganisation' },
    { value: '411', label: '411 - Investment-related loan to developing country' },
    { value: '412', label: '412 - Loan in a joint venture with the recipient' },
    { value: '413', label: '413 - Loan to national private investor' },
    { value: '414', label: '414 - Non-banks guaranteed export credits' }
  ],
  aid_type: [
    { value: 'A01', label: 'A01 - General budget support' },
    { value: 'A02', label: 'A02 - Sector budget support' },
    { value: 'B01', label: 'B01 - Core support to NGOs, CSOs and PPPs' },
    { value: 'B02', label: 'B02 - Core contributions to multilateral institutions' },
    { value: 'B03', label: 'B03 - Contributions to specific-purpose programmes' },
    { value: 'B04', label: 'B04 - Basket funds/pooled funding' },
    { value: 'C01', label: 'C01 - Project-type interventions' },
    { value: 'D01', label: 'D01 - Donor country personnel' },
    { value: 'D02', label: 'D02 - Other technical assistance' },
    { value: 'E01', label: 'E01 - Scholarships/training in donor country' },
    { value: 'E02', label: 'E02 - Imputed student costs' },
    { value: 'F01', label: 'F01 - Debt relief' },
    { value: 'G01', label: 'G01 - Administrative costs not included elsewhere' },
    { value: 'H01', label: 'H01 - Development awareness' },
    { value: 'H02', label: 'H02 - Refugees in donor countries' }
  ],
  tied_status: [
    { value: '1', label: '1 - Partially tied' },
    { value: '3', label: '3 - Tied' },
    { value: '4', label: '4 - Untied' },
    { value: '5', label: '5 - Tied' }
  ],
  disbursement_channel: [
    { value: '1', label: '1 - Government' },
    { value: '2', label: '2 - NGO' },
    { value: '3', label: '3 - Public-Private Partnership' },
    { value: '4', label: '4 - Multilateral Organisation' },
    { value: '5', label: '5 - Teaching Institution' },
    { value: '6', label: '6 - Private Sector Institution' },
    { value: '7', label: '7 - Other' }
  ]
};

export function MapCodesModal({
  isOpen,
  onClose,
  unmappedCodes,
  onComplete
}: MapCodesModalProps) {
  // Track mappings: codeType -> originalCode -> mappedCode
  const [mappings, setMappings] = useState<CodeMapping>({});
  const [manualMode, setManualMode] = useState<{ [key: string]: boolean }>({});

  // Get total unmapped codes count
  const totalUnmappedCodes = useMemo(() => {
    return Object.values(unmappedCodes).reduce((sum, codes) => sum + codes.length, 0);
  }, [unmappedCodes]);

  // Get mapped codes count
  const mappedCodesCount = useMemo(() => {
    return Object.values(mappings).reduce((sum, typeMapping) => {
      return sum + Object.keys(typeMapping).length;
    }, 0);
  }, [mappings]);

  // Check if all codes are mapped
  const allCodesMapped = mappedCodesCount === totalUnmappedCodes;

  // Handle code mapping
  const handleMapping = (codeType: string, originalCode: string, mappedCode: string) => {
    setMappings(prev => ({
      ...prev,
      [codeType]: {
        ...prev[codeType],
        [originalCode]: mappedCode
      }
    }));
  };

  // Toggle manual mode
  const toggleManualMode = (codeType: string, code: string) => {
    const key = `${codeType}-${code}`;
    setManualMode(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Get code type label
  const getCodeTypeLabel = (codeType: string): string => {
    const labels: { [key: string]: string } = {
      transaction_type: 'Transaction Type',
      flow_type: 'Flow Type',
      finance_type: 'Finance Type',
      aid_type: 'Aid Type',
      tied_status: 'Tied Status',
      disbursement_channel: 'Disbursement Channel',
      sector_code: 'Sector Code'
    };
    return labels[codeType] || codeType;
  };

  const handleProceed = () => {
    onComplete(mappings);
  };

  if (totalUnmappedCodes === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Map Unmapped Codes
          </DialogTitle>
          <DialogDescription>
            {totalUnmappedCodes} code{totalUnmappedCodes > 1 ? 's' : ''} need to be mapped to system values before import.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary Alert */}
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription>
              These codes were found in the import file but don't match any recognized system codes. 
              Please map them to valid system codes or enter custom values.
            </AlertDescription>
          </Alert>

          {/* Progress Summary */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">
              Mapped: {mappedCodesCount} / {totalUnmappedCodes}
            </span>
            {allCodesMapped && (
              <Badge variant="default" className="bg-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                All codes mapped
              </Badge>
            )}
          </div>

          {/* Code Mapping List */}
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-6">
              {Object.entries(unmappedCodes).map(([codeType, codes]) => (
                <Card key={codeType}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileCode className="h-4 w-4" />
                      {getCodeTypeLabel(codeType)}
                      <Badge variant="secondary">{codes.length} unmapped</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {codes.map(code => {
                        const key = `${codeType}-${code}`;
                        const isManual = manualMode[key];
                        const isMapped = mappings[codeType]?.[code];
                        const systemCodes = SYSTEM_CODES[codeType as keyof typeof SYSTEM_CODES] || [];

                        return (
                          <div key={code} className={`flex items-center gap-4 p-3 rounded-lg border ${isMapped ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <code className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                                  {code || '<empty>'}
                                </code>
                                {isMapped && (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">Map to:</span>
                              
                              {!isManual && systemCodes.length > 0 ? (
                                <Select 
                                  value={mappings[codeType]?.[code] || ''} 
                                  onValueChange={(value) => handleMapping(codeType, code, value)}
                                >
                                  <SelectTrigger className="w-[300px]">
                                    <SelectValue placeholder="Select a system code" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {systemCodes.map(systemCode => (
                                      <SelectItem key={systemCode.value} value={systemCode.value}>
                                        {systemCode.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  type="text"
                                  placeholder="Enter custom value"
                                  value={mappings[codeType]?.[code] || ''}
                                  onChange={(e) => handleMapping(codeType, code, e.target.value)}
                                  className="w-[300px]"
                                />
                              )}
                              
                              {systemCodes.length > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleManualMode(codeType, code)}
                                >
                                  {isManual ? 'Use dropdown' : 'Manual input'}
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              if (confirm('Are you sure? Unmapped codes will prevent import.')) {
                onClose();
              }
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleProceed}
            disabled={!allCodesMapped}
          >
            Continue Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 