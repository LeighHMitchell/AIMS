'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DollarSign,
  Link2,
  Hash,
  Building2,
  FileWarning,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';

interface ValidationIssue {
  type: 'missing_currency' | 'missing_activity' | 'unmapped_code' | 'missing_org' | 'missing_required' | 'invalid_value';
  severity: 'error' | 'warning';
  count: number;
  details: {
    activityId?: string;
    transactionIndex?: number;
    field?: string;
    value?: any;
    message: string;
  }[];
}

interface Transaction {
  type: string;
  date: string;
  value: number;
  currency?: string;
  activityRef?: string;
  providerOrg?: string;
  receiverOrg?: string;
  [key: string]: any;
}

interface Activity {
  id: string;
  iati_id: string;
  title: string;
}

interface FixWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  validationIssues: ValidationIssue[];
  transactions: Transaction[];
  activities?: Activity[];
  onApplyFixes: (fixes: FixSet) => void;
}

interface FixSet {
  currencyFixes: Record<number, string>;
  activityMappings: Record<string, string>;
  codeMappings: Record<string, Record<string, string>>;
  organizationFixes: Record<number, { provider?: string; receiver?: string }>;
  skipTransactions: number[];
}

const CURRENCY_OPTIONS = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'ZAR', name: 'South African Rand' }
];

const TRANSACTION_TYPE_MAPPING = {
  '1': 'Incoming Commitment',
  '2': 'Outgoing Commitment',
  '3': 'Disbursement',
  '4': 'Expenditure',
  '5': 'Interest Payment',
  '6': 'Loan Repayment',
  '7': 'Reimbursement',
  '8': 'Purchase of Equity',
  '9': 'Sale of Equity',
  '11': 'Credit Guarantee',
  '12': 'Incoming Funds',
  '13': 'Commitment Cancellation'
};

export function FixWizardModal({
  isOpen,
  onClose,
  validationIssues,
  transactions,
  activities = [],
  onApplyFixes
}: FixWizardModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [fixes, setFixes] = useState<FixSet>({
    currencyFixes: {},
    activityMappings: {},
    codeMappings: {},
    organizationFixes: {},
    skipTransactions: []
  });
  const [applyToAll, setApplyToAll] = useState<Record<string, boolean>>({});

  // Filter issues by type
  const issuesByType = validationIssues.reduce((acc, issue) => {
    if (!acc[issue.type]) acc[issue.type] = [];
    acc[issue.type].push(issue);
    return acc;
  }, {} as Record<string, ValidationIssue[]>);

  const steps = Object.keys(issuesByType).map(type => ({
    type,
    issues: issuesByType[type]
  }));

  const currentIssueType = steps[currentStep]?.type;
  const currentIssues = steps[currentStep]?.issues || [];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onApplyFixes(fixes);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderFixInterface = () => {
    if (!currentIssueType) return null;

    switch (currentIssueType) {
      case 'missing_currency':
        return <CurrencyFix />;
      case 'missing_activity':
        return <ActivityMappingFix />;
      case 'unmapped_code':
        return <CodeMappingFix />;
      case 'missing_org':
        return <OrganizationFix />;
      case 'missing_required':
      case 'invalid_value':
        return <InvalidValueFix />;
      default:
        return null;
    }
  };

  // Currency Fix Component
  const CurrencyFix = () => {
    const [defaultCurrency, setDefaultCurrency] = useState('USD');
    const missingCurrencyDetails = currentIssues[0]?.details || [];

    return (
      <div className="space-y-4">
        <Alert>
          <DollarSign className="h-4 w-4" />
          <AlertDescription>
            {missingCurrencyDetails.length} transactions are missing currency information. 
            You can apply a default currency to all or set individually.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="flex items-center space-x-4">
            <Label>Default Currency:</Label>
            <Select value={defaultCurrency} onValueChange={setDefaultCurrency}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.map(opt => (
                  <SelectItem key={opt.code} value={opt.code}>
                    {opt.code} - {opt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newFixes = { ...fixes };
                missingCurrencyDetails.forEach(detail => {
                  if (detail.transactionIndex !== undefined) {
                    newFixes.currencyFixes[detail.transactionIndex] = defaultCurrency;
                  }
                });
                setFixes(newFixes);
              }}
            >
              Apply to All
            </Button>
          </div>

          <div className="border-t my-4" />

          <ScrollArea className="h-64">
            <div className="space-y-2">
              {missingCurrencyDetails.map((detail, idx) => {
                const txIndex = detail.transactionIndex || 0;
                const transaction = transactions[txIndex];
                
                return (
                  <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        Transaction #{txIndex + 1}
                      </p>
                      <p className="text-xs text-gray-600">
                        {transaction?.type} - {transaction?.value} on {transaction?.date}
                      </p>
                    </div>
                    <Select
                      value={fixes.currencyFixes[txIndex] || defaultCurrency}
                      onValueChange={(value) => {
                        setFixes({
                          ...fixes,
                          currencyFixes: {
                            ...fixes.currencyFixes,
                            [txIndex]: value
                          }
                        });
                      }}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCY_OPTIONS.map(opt => (
                          <SelectItem key={opt.code} value={opt.code}>
                            {opt.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  };

  // Activity Mapping Fix Component
  const ActivityMappingFix = () => {
    const missingActivityDetails = currentIssues[0]?.details || [];
    const uniqueActivities = Array.from(new Set(missingActivityDetails.map(d => d.activityId).filter(Boolean)));

    return (
      <div className="space-y-4">
        <Alert>
          <Link2 className="h-4 w-4" />
          <AlertDescription>
            {uniqueActivities.length} activities referenced in transactions are not found in the system. 
            Map them to existing activities or create new ones.
          </AlertDescription>
        </Alert>

        <ScrollArea className="h-64">
          <div className="space-y-3">
            {uniqueActivities.map((iatiId) => (
              <div key={iatiId} className="p-4 border rounded-lg space-y-3">
                <div>
                  <p className="font-medium">IATI ID: {iatiId}</p>
                  <p className="text-sm text-gray-600">
                    {missingActivityDetails.filter(d => d.activityId === iatiId).length} transactions
                  </p>
                </div>
                
                <Select
                  value={fixes.activityMappings[iatiId || ''] || 'create_new'}
                  onValueChange={(value) => {
                    setFixes({
                      ...fixes,
                      activityMappings: {
                        ...fixes.activityMappings,
                        [iatiId || '']: value
                      }
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="create_new">
                      <span className="flex items-center">
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Create new activity
                      </span>
                    </SelectItem>
                    <div className="my-2 h-px bg-gray-200" />
                    {activities.map(activity => (
                      <SelectItem key={activity.id} value={activity.id}>
                        {activity.title} ({activity.iati_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  };

  // Code Mapping Fix Component
  const CodeMappingFix = () => {
    const codeIssues = currentIssues[0]?.details || [];
    const codesByField = codeIssues.reduce((acc, detail) => {
      const field = detail.field || 'unknown';
      if (!acc[field]) acc[field] = new Set();
      acc[field].add(detail.value);
      return acc;
    }, {} as Record<string, Set<any>>);

    return (
      <div className="space-y-4">
        <Alert>
          <Hash className="h-4 w-4" />
          <AlertDescription>
            Map unrecognized codes to system values.
          </AlertDescription>
        </Alert>

        <ScrollArea className="h-64">
          <div className="space-y-4">
            {Object.entries(codesByField).map(([field, codes]) => (
              <div key={field} className="space-y-3">
                <h4 className="font-medium capitalize">{field.replace('_', ' ')}</h4>
                {Array.from(codes).map(code => (
                  <div key={code} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <div className="flex-1">
                      <Badge variant="outline">{code}</Badge>
                    </div>
                    {field === 'transaction_type' && (
                      <Select
                        value={fixes.codeMappings[field]?.[code] || code}
                        onValueChange={(value) => {
                          setFixes({
                            ...fixes,
                            codeMappings: {
                              ...fixes.codeMappings,
                              [field]: {
                                ...fixes.codeMappings[field],
                                [code]: value
                              }
                            }
                          });
                        }}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TRANSACTION_TYPE_MAPPING).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {key} - {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  };

  // Organization Fix Component
  const OrganizationFix = () => {
    const orgIssues = currentIssues[0]?.details || [];

    return (
      <div className="space-y-4">
        <Alert>
          <Building2 className="h-4 w-4" />
          <AlertDescription>
            Some transactions are missing organization information. You can add them now or leave blank.
          </AlertDescription>
        </Alert>

        <ScrollArea className="h-64">
          <div className="space-y-3">
            {orgIssues.map((detail, idx) => {
              const txIndex = detail.transactionIndex || 0;
              const transaction = transactions[txIndex];
              
              return (
                <div key={idx} className="p-4 border rounded-lg space-y-3">
                  <p className="text-sm font-medium">
                    Transaction #{txIndex + 1}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Provider Organization</Label>
                      <Input
                        placeholder="Enter provider name"
                        value={fixes.organizationFixes[txIndex]?.provider || ''}
                        onChange={(e) => {
                          setFixes({
                            ...fixes,
                            organizationFixes: {
                              ...fixes.organizationFixes,
                              [txIndex]: {
                                ...fixes.organizationFixes[txIndex],
                                provider: e.target.value
                              }
                            }
                          });
                        }}
                      />
                    </div>
                    
                    <div>
                      <Label className="text-xs">Receiver Organization</Label>
                      <Input
                        placeholder="Enter receiver name"
                        value={fixes.organizationFixes[txIndex]?.receiver || ''}
                        onChange={(e) => {
                          setFixes({
                            ...fixes,
                            organizationFixes: {
                              ...fixes.organizationFixes,
                              [txIndex]: {
                                ...fixes.organizationFixes[txIndex],
                                receiver: e.target.value
                              }
                            }
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    );
  };

  // Invalid Value Fix Component
  const InvalidValueFix = () => {
    const invalidDetails = currentIssues[0]?.details || [];

    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            These transactions have invalid data and cannot be imported. 
            You can skip them or fix the source XML file.
          </AlertDescription>
        </Alert>

        <ScrollArea className="h-64">
          <div className="space-y-3">
            {invalidDetails.map((detail, idx) => {
              const txIndex = detail.transactionIndex || 0;
              
              return (
                <div key={idx} className="p-4 border border-red-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        Transaction #{txIndex + 1}
                      </p>
                      <p className="text-xs text-red-600">
                        {detail.message}
                      </p>
                    </div>
                    <Checkbox
                      checked={!fixes.skipTransactions.includes(txIndex)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFixes({
                            ...fixes,
                            skipTransactions: fixes.skipTransactions.filter(i => i !== txIndex)
                          });
                        } else {
                          setFixes({
                            ...fixes,
                            skipTransactions: [...fixes.skipTransactions, txIndex]
                          });
                        }
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Fix Import Issues</DialogTitle>
          <DialogDescription>
            Step {currentStep + 1} of {steps.length} - Fixing {currentIssueType?.replace('_', ' ')}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {renderFixInterface()}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button onClick={handleNext}>
            {currentStep === steps.length - 1 ? 'Apply Fixes' : 'Next'}
            {currentStep < steps.length - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 