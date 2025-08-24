'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  Plus,
  Copy,
  RotateCcw,
  HelpCircle,
  DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTransactionSectors } from '@/hooks/use-transaction-sectors';
import { SectorSelect } from '@/components/forms/SectorSelect';
import { formatCurrency } from '@/lib/utils';

interface TransactionSectorsTabProps {
  transactionId: string;
  transactionValue: number;
  transactionCurrency: string;
  activityId: string;
  disabled?: boolean;
  className?: string;
}

export default function TransactionSectorsTab({
  transactionId,
  transactionValue,
  transactionCurrency,
  activityId,
  disabled = false,
  className
}: TransactionSectorsTabProps) {
  
  const [showSectorSelect, setShowSectorSelect] = useState(false);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  
  const {
    sectorLines,
    validation,
    isLoading,
    isSaving,
    error,
    addSectorLine,
    updateSectorLine,
    removeSectorLine,
    copyFromActivity,
    distributeEqually,
    clearAllSectors,
    canSave,
    hasUnsavedChanges
  } = useTransactionSectors({
    transactionId,
    transactionValue,
    transactionCurrency,
    activityId
  });
  
  // Handle adding a new sector
  const handleAddSector = (sectorCode: string, sectorName: string) => {
    const remainingPercentage = validation?.remainingPercentage || 100;
    const suggestedPercentage = sectorLines.length === 0 ? 100 : Math.min(remainingPercentage, 10);
    
    addSectorLine(sectorCode, sectorName, suggestedPercentage);
    setShowSectorSelect(false);
  };
  
  // Handle percentage change
  const handlePercentageChange = (lineId: string, value: string) => {
    const percentage = parseFloat(value) || 0;
    updateSectorLine(lineId, { percentage });
  };
  
  // Handle copy from activity
  const handleCopyFromActivity = async () => {
    const success = await copyFromActivity(true);
    if (success) {
      setShowSectorSelect(false);
    }
  };
  
  // Handle distribute equally
  const handleDistributeEqually = () => {
    distributeEqually();
  };
  
  // Format amount for display
  const formatAmount = (amountMinor: number) => {
    return formatCurrency(amountMinor / 100, transactionCurrency);
  };
  
  // Calculate computed amount for a percentage
  const calculateAmount = (percentage: number) => {
    return (transactionValue * percentage / 100);
  };
  
  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading sector allocations...</span>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Transaction Sectors</h3>
          <p className="text-sm text-muted-foreground">
            Allocate this transaction across different sectors
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <Badge variant="outline" className="text-orange-600">
              Unsaved changes
            </Badge>
          )}
          {isSaving && (
            <Badge variant="outline" className="text-blue-600">
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              Saving...
            </Badge>
          )}
        </div>
      </div>
      
      {/* Error display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Empty state */}
      {sectorLines.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h4 className="font-medium">No sector allocations yet</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Adding sector splits helps with downstream analytics and aligns 
                  transaction records with sector reporting.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Button 
                  onClick={() => setShowSectorSelect(true)}
                  disabled={disabled}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Sector
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleCopyFromActivity}
                  disabled={disabled}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy from Activity
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Sector allocations table */}
      {sectorLines.length > 0 && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Sector Allocations</CardTitle>
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setShowSectorSelect(true)}
                  disabled={disabled}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Sector
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleCopyFromActivity}
                  disabled={disabled}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy from Activity
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleDistributeEqually}
                  disabled={disabled || sectorLines.length === 0}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Distribute Equally
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Sector Code</TableHead>
                    <TableHead>Sector Name</TableHead>
                    <TableHead className="w-[120px]">Percentage</TableHead>
                    <TableHead className="w-[140px]">Amount</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sectorLines.map((line, index) => (
                    <TableRow key={line.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {line.sector_code}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate" title={line.sector_name}>
                          {line.sector_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={line.percentage}
                            onChange={(e) => handlePercentageChange(line.id, e.target.value)}
                            className="w-20 text-right"
                            disabled={disabled}
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm">
                          {formatAmount(line.amount_minor)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeSectorLine(line.id)}
                          disabled={disabled}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Validation summary */}
            <div className="space-y-3">
              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Total Allocation</span>
                  <span className={cn(
                    "font-medium",
                    validation?.isValid ? "text-green-600" : "text-red-600"
                  )}>
                    {validation?.totalPercentage.toFixed(1)}% of 100%
                  </span>
                </div>
                <Progress 
                  value={validation?.totalPercentage || 0} 
                  className={cn(
                    "h-2",
                    validation?.totalPercentage && validation.totalPercentage > 100 && "bg-red-100"
                  )}
                />
              </div>
              
              {/* Summary stats */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Amount:</span>
                  <span className="font-mono">
                    {formatCurrency(validation?.totalAmount || 0, transactionCurrency)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Transaction Value:</span>
                  <span className="font-mono">
                    {formatCurrency(transactionValue, transactionCurrency)}
                  </span>
                </div>
              </div>
              
              {/* Validation status */}
              {validation && (
                <div className="flex items-center gap-2">
                  {validation.isValid ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-600 font-medium">
                        Valid allocation (100%)
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-600 font-medium">
                        {validation.errors[0] || 'Invalid allocation'}
                      </span>
                    </>
                  )}
                </div>
              )}
              
              {/* Validation errors */}
              {validation?.errors && validation.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1">
                      {validation.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Sector selection modal/dropdown */}
      {showSectorSelect && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Sector Allocation</CardTitle>
            <CardDescription>
              Search and select a sector to add to this transaction
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SectorSelect
              onSectorSelect={(sector) => {
                handleAddSector(sector.code, sector.name);
              }}
              excludeCodes={sectorLines.map(line => line.sector_code)}
              placeholder="Search for a sector..."
              className="w-full"
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowSectorSelect(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Help text */}
      <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
        <HelpCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="text-sm text-muted-foreground">
          <p>
            <strong>Transaction sectors</strong> allow you to specify how this specific 
            transaction is allocated across different sectors. This provides more granular 
            reporting than activity-level sectors alone.
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Percentages must total exactly 100%</li>
            <li>Each sector can only be used once per transaction</li>
            <li>Use "Copy from Activity" to start with your activity's sector mix</li>
            <li>Changes are saved automatically</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

