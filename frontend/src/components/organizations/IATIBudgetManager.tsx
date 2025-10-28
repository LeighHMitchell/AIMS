"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Edit2, Trash2, Calendar, DollarSign, Building2, Globe2, MapPin } from 'lucide-react'

interface BudgetLine {
  id?: string;
  ref?: string;
  value?: number;
  currency?: string;
  valueDate?: string;
  narrative?: string;
  languageCode?: string;
}

interface Budget {
  id?: string;
  budgetType: 'total' | 'recipient-org' | 'recipient-country' | 'recipient-region';
  budgetStatus: '1' | '2'; // 1=indicative, 2=committed
  periodStart?: string;
  periodEnd?: string;
  value?: number;
  currency?: string;
  valueDate?: string;
  recipientRef?: string;
  recipientNarrative?: string;
  recipientVocabulary?: string;
  recipientVocabularyUri?: string;
  budgetLines?: BudgetLine[];
}

interface IATIBudgetManagerProps {
  organizationId?: string;
  budgets: Budget[];
  onChange: (budgets: Budget[]) => void;
  defaultCurrency?: string;
  readOnly?: boolean;
}

const BUDGET_TYPES = [
  { value: 'total', label: 'Total Budgeted', icon: DollarSign, description: 'Overall organizational budget' },
  { value: 'recipient-org', label: 'Recipient Organization', icon: Building2, description: 'Budget allocated to specific organizations' },
  { value: 'recipient-country', label: 'Recipient Country', icon: MapPin, description: 'Budget allocated to specific countries' },
  { value: 'recipient-region', label: 'Recipient Region', icon: Globe2, description: 'Budget allocated to specific regions' }
];

const BUDGET_STATUS_OPTIONS = [
  { value: '1', label: 'Indicative', description: 'Indicative budget (planned)' },
  { value: '2', label: 'Committed', description: 'Committed budget (approved)' }
];

const COMMON_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SEK', 'NOK', 'DKK'];

export function IATIBudgetManager({ 
  organizationId, 
  budgets, 
  onChange, 
  defaultCurrency = 'USD',
  readOnly = false 
}: IATIBudgetManagerProps) {
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [editingBudgetLine, setEditingBudgetLine] = useState<{ budgetIndex: number; line: BudgetLine } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [budgetLineModalOpen, setBudgetLineModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('total');

  // Group budgets by type
  const budgetsByType = budgets.reduce((acc, budget) => {
    if (!acc[budget.budgetType]) acc[budget.budgetType] = [];
    acc[budget.budgetType].push(budget);
    return acc;
  }, {} as Record<string, Budget[]>);

  const handleAddBudget = (budgetType: Budget['budgetType']) => {
    setEditingBudget({
      budgetType,
      budgetStatus: '1',
      currency: defaultCurrency,
      budgetLines: []
    });
    setModalOpen(true);
  };

  const handleEditBudget = (budget: Budget) => {
    setEditingBudget({ ...budget });
    setModalOpen(true);
  };

  const handleDeleteBudget = (budgetIndex: number) => {
    const newBudgets = budgets.filter((_, index) => index !== budgetIndex);
    onChange(newBudgets);
    console.log('Budget deleted successfully');
  };

  const handleSaveBudget = () => {
    if (!editingBudget) return;

    const existingIndex = budgets.findIndex(b => b.id === editingBudget.id);
    let newBudgets;

    if (existingIndex >= 0) {
      newBudgets = [...budgets];
      newBudgets[existingIndex] = editingBudget;
    } else {
      newBudgets = [...budgets, { ...editingBudget, id: `temp-${Date.now()}` }];
    }

    onChange(newBudgets);
    setModalOpen(false);
    setEditingBudget(null);
    console.log('Budget saved successfully');
  };

  const handleAddBudgetLine = (budgetIndex: number) => {
    setEditingBudgetLine({
      budgetIndex,
      line: {
        currency: defaultCurrency,
        languageCode: 'en'
      }
    });
    setBudgetLineModalOpen(true);
  };

  const handleEditBudgetLine = (budgetIndex: number, lineIndex: number) => {
    const line = budgets[budgetIndex].budgetLines?.[lineIndex];
    if (line) {
      setEditingBudgetLine({
        budgetIndex,
        line: { ...line }
      });
      setBudgetLineModalOpen(true);
    }
  };

  const handleSaveBudgetLine = () => {
    if (!editingBudgetLine) return;

    const { budgetIndex, line } = editingBudgetLine;
    const newBudgets = [...budgets];
    const budget = newBudgets[budgetIndex];

    if (!budget.budgetLines) budget.budgetLines = [];

    const existingLineIndex = budget.budgetLines.findIndex(l => l.id === line.id);
    if (existingLineIndex >= 0) {
      budget.budgetLines[existingLineIndex] = line;
    } else {
      budget.budgetLines.push({ ...line, id: `temp-line-${Date.now()}` });
    }

    onChange(newBudgets);
    setBudgetLineModalOpen(false);
    setEditingBudgetLine(null);
    console.log('Budget line saved successfully');
  };

  const handleDeleteBudgetLine = (budgetIndex: number, lineIndex: number) => {
    const newBudgets = [...budgets];
    const budget = newBudgets[budgetIndex];
    if (budget.budgetLines) {
      budget.budgetLines.splice(lineIndex, 1);
    }
    onChange(newBudgets);
    console.log('Budget line deleted successfully');
  };

  const formatCurrency = (amount: number | undefined, currency: string = defaultCurrency) => {
    if (amount === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const renderBudgetCard = (budget: Budget, budgetIndex: number) => {
    const typeInfo = BUDGET_TYPES.find(t => t.value === budget.budgetType);
    const Icon = typeInfo?.icon || DollarSign;
    const statusLabel = BUDGET_STATUS_OPTIONS.find(s => s.value === budget.budgetStatus)?.label || 'Unknown';
    
    return (
      <Card key={budget.id || budgetIndex} className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon className="h-5 w-5 text-blue-600" />
              <div>
                <CardTitle className="text-base">
                  {typeInfo?.label} - {statusLabel}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {budget.periodStart && budget.periodEnd 
                    ? `${budget.periodStart} to ${budget.periodEnd}`
                    : 'No period specified'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {formatCurrency(budget.value, budget.currency)}
              </Badge>
              {!readOnly && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditBudget(budget)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteBudget(budgetIndex)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        
        {(budget.recipientRef || budget.recipientNarrative) && (
          <CardContent className="pt-0 pb-3">
            <div className="text-sm">
              <span className="font-medium">Recipient:</span>{' '}
              {budget.recipientNarrative || budget.recipientRef}
              {budget.recipientRef && budget.recipientNarrative && (
                <span className="text-muted-foreground ml-1">({budget.recipientRef})</span>
              )}
            </div>
          </CardContent>
        )}

        {budget.budgetLines && budget.budgetLines.length > 0 && (
          <CardContent className="pt-0">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Budget Lines</Label>
                {!readOnly && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddBudgetLine(budgetIndex)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Line
                  </Button>
                )}
              </div>
              <div className="space-y-1">
                {budget.budgetLines.map((line, lineIndex) => (
                  <div
                    key={line.id || lineIndex}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {line.narrative || `Line ${lineIndex + 1}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(line.value, line.currency)}
                        {line.ref && <span className="ml-2">Ref: {line.ref}</span>}
                      </div>
                    </div>
                    {!readOnly && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditBudgetLine(budgetIndex, lineIndex)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteBudgetLine(budgetIndex, lineIndex)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        )}

        {!readOnly && (!budget.budgetLines || budget.budgetLines.length === 0) && (
          <CardContent className="pt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddBudgetLine(budgetIndex)}
              className="w-full"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Budget Lines
            </Button>
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">IATI Budgets</h3>
          <p className="text-sm text-muted-foreground">
            Manage organization budgets according to IATI standards
          </p>
        </div>
        {!readOnly && (
          <div className="text-sm text-muted-foreground">
            Total: {budgets.length} budget{budgets.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          {BUDGET_TYPES.map((type) => (
            <TabsTrigger key={type.value} value={type.value} className="text-xs">
              <type.icon className="h-3 w-3 mr-1" />
              {type.label.split(' ')[0]}
            </TabsTrigger>
          ))}
        </TabsList>

        {BUDGET_TYPES.map((type) => (
          <TabsContent key={type.value} value={type.value} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{type.label}</h4>
                <p className="text-sm text-muted-foreground">{type.description}</p>
              </div>
              {!readOnly && (
                <Button
                  variant="outline"
                  onClick={() => handleAddBudget(type.value as Budget['budgetType'])}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add {type.label}
                </Button>
              )}
            </div>

            <div>
              {budgetsByType[type.value]?.length > 0 ? (
                budgetsByType[type.value].map((budget, index) => {
                  const globalIndex = budgets.findIndex(b => b === budget);
                  return renderBudgetCard(budget, globalIndex);
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {!readOnly && (
                    <Button
                      variant="outline"
                      onClick={() => handleAddBudget(type.value as Budget['budgetType'])}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Budget
                    </Button>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Budget Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingBudget?.id ? 'Edit Budget' : 'Add Budget'}
            </DialogTitle>
          </DialogHeader>

          {editingBudget && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Budget Status</Label>
                  <Select
                    value={editingBudget.budgetStatus}
                    onValueChange={(value: '1' | '2') => 
                      setEditingBudget({ ...editingBudget, budgetStatus: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BUDGET_STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          <div>
                            <div className="font-medium">{status.label}</div>
                            <div className="text-xs text-muted-foreground">{status.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select
                    value={editingBudget.currency || defaultCurrency}
                    onValueChange={(value) => 
                      setEditingBudget({ ...editingBudget, currency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_CURRENCIES.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Period Start</Label>
                  <Input
                    type="date"
                    value={editingBudget.periodStart || ''}
                    onChange={(e) => 
                      setEditingBudget({ ...editingBudget, periodStart: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Period End</Label>
                  <Input
                    type="date"
                    value={editingBudget.periodEnd || ''}
                    onChange={(e) => 
                      setEditingBudget({ ...editingBudget, periodEnd: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Budget Value</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={editingBudget.value || ''}
                    onChange={(e) => 
                      setEditingBudget({ ...editingBudget, value: parseFloat(e.target.value) || undefined })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Value Date</Label>
                  <Input
                    type="date"
                    value={editingBudget.valueDate || ''}
                    onChange={(e) => 
                      setEditingBudget({ ...editingBudget, valueDate: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Recipient fields for non-total budgets */}
              {editingBudget.budgetType !== 'total' && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h4 className="font-medium">Recipient Information</h4>
                    
                    <div className="space-y-2">
                      <Label>Recipient Reference</Label>
                      <Input
                        placeholder={
                          editingBudget.budgetType === 'recipient-org' ? 'Organization ID (e.g., AA-AAA-123456789)' :
                          editingBudget.budgetType === 'recipient-country' ? 'Country Code (e.g., AF)' :
                          'Region Code (e.g., A1)'
                        }
                        value={editingBudget.recipientRef || ''}
                        onChange={(e) => 
                          setEditingBudget({ ...editingBudget, recipientRef: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Recipient Name</Label>
                      <Input
                        placeholder="Human-readable name"
                        value={editingBudget.recipientNarrative || ''}
                        onChange={(e) => 
                          setEditingBudget({ ...editingBudget, recipientNarrative: e.target.value })
                        }
                      />
                    </div>

                    {editingBudget.budgetType === 'recipient-region' && (
                      <>
                        <div className="space-y-2">
                          <Label>Vocabulary</Label>
                          <Input
                            placeholder="Vocabulary used (e.g., 99 for custom)"
                            value={editingBudget.recipientVocabulary || ''}
                            onChange={(e) => 
                              setEditingBudget({ ...editingBudget, recipientVocabulary: e.target.value })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Vocabulary URI</Label>
                          <Input
                            type="url"
                            placeholder="http://example.com/vocab.html"
                            value={editingBudget.recipientVocabularyUri || ''}
                            onChange={(e) => 
                              setEditingBudget({ ...editingBudget, recipientVocabularyUri: e.target.value })
                            }
                          />
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveBudget}>
              Save Budget
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Budget Line Edit Modal */}
      <Dialog open={budgetLineModalOpen} onOpenChange={setBudgetLineModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBudgetLine?.line.id ? 'Edit Budget Line' : 'Add Budget Line'}
            </DialogTitle>
          </DialogHeader>

          {editingBudgetLine && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Reference</Label>
                <Input
                  placeholder="Budget line reference"
                  value={editingBudgetLine.line.ref || ''}
                  onChange={(e) => 
                    setEditingBudgetLine({
                      ...editingBudgetLine,
                      line: { ...editingBudgetLine.line, ref: e.target.value }
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Value</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={editingBudgetLine.line.value || ''}
                    onChange={(e) => 
                      setEditingBudgetLine({
                        ...editingBudgetLine,
                        line: { ...editingBudgetLine.line, value: parseFloat(e.target.value) || undefined }
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select
                    value={editingBudgetLine.line.currency || defaultCurrency}
                    onValueChange={(value) => 
                      setEditingBudgetLine({
                        ...editingBudgetLine,
                        line: { ...editingBudgetLine.line, currency: value }
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_CURRENCIES.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Value Date</Label>
                <Input
                  type="date"
                  value={editingBudgetLine.line.valueDate || ''}
                  onChange={(e) => 
                    setEditingBudgetLine({
                      ...editingBudgetLine,
                      line: { ...editingBudgetLine.line, valueDate: e.target.value }
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Budget line description"
                  value={editingBudgetLine.line.narrative || ''}
                  onChange={(e) => 
                    setEditingBudgetLine({
                      ...editingBudgetLine,
                      line: { ...editingBudgetLine.line, narrative: e.target.value }
                    })
                  }
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setBudgetLineModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveBudgetLine}>
              Save Budget Line
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
