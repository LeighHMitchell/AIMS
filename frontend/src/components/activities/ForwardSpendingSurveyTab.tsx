'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { Trash2, Plus, Loader2, Edit, Save, X, AlertCircle, CheckCircle, TrendingUp, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAllCurrenciesWithPinned, type Currency } from '@/data/currencies';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { fixedCurrencyConverter } from '@/lib/currency-converter-fixed';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/hooks/useUser';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ForwardSpendingSurvey, FSSForecast, FSS_PRIORITY_LEVELS } from '@/types/fss';

interface ForwardSpendingSurveyTabProps {
  activityId: string;
  readOnly?: boolean;
  onFssChange?: (count: number) => void;
}

// Hero Card Component
interface HeroCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon?: React.ReactNode;
}

function HeroCard({ title, value, subtitle, icon }: HeroCardProps) {
  return (
    <div className="p-4 border rounded-xl bg-white shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-muted-foreground">{title}</div>
          <div className="text-2xl font-bold mt-1">{value}</div>
          <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
        </div>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
    </div>
  );
}

export default function ForwardSpendingSurveyTab({ 
  activityId, 
  readOnly = false,
  onFssChange
}: ForwardSpendingSurveyTabProps) {
  const [fss, setFss] = useState<ForwardSpendingSurvey | null>(null);
  const [forecasts, setForecasts] = useState<FSSForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingFss, setSavingFss] = useState(false);
  const [savingForecast, setSavingForecast] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const { user, isLoading: userLoading } = useUser();
  const isReadOnly = readOnly;

  // Modal state
  const [showForecastModal, setShowForecastModal] = useState(false);
  const [modalForecast, setModalForecast] = useState<FSSForecast | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [isCalculatingUSD, setIsCalculatingUSD] = useState(false);

  // Get all currencies
  const currencies = useMemo(() => getAllCurrenciesWithPinned(), []);

  // Fetch FSS and forecasts
  const fetchFssData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[FSS Tab] Fetching FSS for activity:', activityId);

      const response = await fetch(`/api/activities/${activityId}/fss`);
      if (!response.ok) {
        throw new Error('Failed to fetch FSS data');
      }

      const data = await response.json();
      
      if (data) {
        setFss(data);
        setForecasts(data.forecasts || []);
        console.log('[FSS Tab] Loaded FSS with', data.forecasts?.length || 0, 'forecasts');
        onFssChange?.(data.forecasts?.length > 0 ? 1 : 0);
      } else {
        setFss(null);
        setForecasts([]);
        onFssChange?.(0);
      }
    } catch (err) {
      console.error('[FSS Tab] Error fetching FSS:', err);
      setError('Failed to load forward spending survey data');
    } finally {
      setLoading(false);
    }
  }, [activityId, onFssChange]);

  useEffect(() => {
    if (activityId) {
      fetchFssData();
    }
  }, [activityId, fetchFssData]);

  // Save FSS (extraction date, priority, phaseout year)
  const saveFss = async (updatedFss: Partial<ForwardSpendingSurvey>) => {
    try {
      setSavingFss(true);
      console.log('[FSS Tab] Saving FSS:', updatedFss);

      const response = await fetch(`/api/activities/${activityId}/fss`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updatedFss,
          activity_id: activityId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save FSS');
      }

      const savedFss = await response.json();
      setFss(savedFss);
      toast.success('Forward Spending Survey saved');
      return savedFss;
    } catch (err: any) {
      console.error('[FSS Tab] Error saving FSS:', err);
      toast.error(err.message || 'Failed to save FSS');
      throw err;
    } finally {
      setSavingFss(false);
    }
  };

  // Delete FSS
  const deleteFss = async () => {
    if (!confirm('Are you sure you want to delete the Forward Spending Survey? This will remove all forecasts.')) {
      return;
    }

    try {
      const response = await fetch(`/api/activities/${activityId}/fss`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete FSS');
      }

      setFss(null);
      setForecasts([]);
      onFssChange?.(0);
      toast.success('Forward Spending Survey deleted');
    } catch (err) {
      console.error('[FSS Tab] Error deleting FSS:', err);
      toast.error('Failed to delete FSS');
    }
  };

  // Modal handlers
  const openForecastModal = (forecast?: FSSForecast) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const currentYear = new Date().getFullYear();
    
    const newForecast = forecast ? { ...forecast } : {
      fss_id: fss?.id || '',
      forecast_year: currentYear + 1,
      amount: 0,
      currency: 'USD',
      value_date: today,
      usd_amount: 0,
      notes: ''
    };
    
    setModalForecast(newForecast as FSSForecast);
    setFieldErrors({});
    setIsFormDirty(false);
    setShowForecastModal(true);
  };

  const closeForecastModal = () => {
    if (isFormDirty) {
      if (confirm('You have unsaved changes. Are you sure you want to close?')) {
        setShowForecastModal(false);
        setModalForecast(null);
        setFieldErrors({});
        setIsFormDirty(false);
      }
    } else {
      setShowForecastModal(false);
      setModalForecast(null);
      setFieldErrors({});
      setIsFormDirty(false);
    }
  };

  // Field validation
  const validateField = (field: string, value: any) => {
    const errors = { ...fieldErrors };
    
    switch (field) {
      case 'forecast_year':
        const year = parseInt(value);
        if (!value || isNaN(year) || year < 2000 || year > 2100) {
          errors.forecast_year = 'Please enter a valid year (2000-2100)';
        } else {
          delete errors.forecast_year;
        }
        break;
      case 'amount':
        if (!value || value <= 0) {
          errors.amount = 'Amount must be greater than 0';
        } else {
          delete errors.amount;
        }
        break;
      case 'currency':
        if (!value) {
          errors.currency = 'Currency is required';
        } else {
          delete errors.currency;
        }
        break;
      case 'value_date':
        if (!value) {
          errors.value_date = 'Value date is required';
        } else {
          delete errors.value_date;
        }
        break;
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form validation
  const validateForecastForm = () => {
    const errors: Record<string, string> = {};
    
    if (!modalForecast?.forecast_year) {
      errors.forecast_year = 'Forecast year is required';
    } else {
      const year = parseInt(modalForecast.forecast_year.toString());
      if (isNaN(year) || year < 2000 || year > 2100) {
        errors.forecast_year = 'Invalid year (must be 2000-2100)';
      }
    }
    
    if (!modalForecast?.amount || modalForecast.amount <= 0) {
      errors.amount = 'Amount must be greater than 0';
    }
    
    if (!modalForecast?.currency) {
      errors.currency = 'Currency is required';
    }
    
    // Check for duplicate years
    const duplicateYear = forecasts.some((f: FSSForecast) => 
      f.id !== modalForecast?.id && f.forecast_year === modalForecast?.forecast_year
    );
    
    if (duplicateYear) {
      errors.forecast_year = 'A forecast for this year already exists';
    }
    
    return errors;
  };

  // Auto-calculate USD value
  useEffect(() => {
    const calculateUSD = async () => {
      if (modalForecast?.amount && modalForecast?.currency && modalForecast?.value_date) {
        setIsCalculatingUSD(true);
        try {
          if (modalForecast.currency === 'USD') {
            setModalForecast(prev => prev ? { ...prev, usd_amount: modalForecast.amount } : null);
          } else {
            const result = await fixedCurrencyConverter.convertToUSD(
              modalForecast.amount,
              modalForecast.currency,
              new Date(modalForecast.value_date)
            );
            setModalForecast(prev => prev ? { ...prev, usd_amount: result.usd_amount || 0 } : null);
          }
        } catch (err) {
          console.error('[FSS Tab] Currency conversion error:', err);
        } finally {
          setIsCalculatingUSD(false);
        }
      }
    };
    
    calculateUSD();
  }, [modalForecast?.amount, modalForecast?.currency, modalForecast?.value_date]);

  // Update form field
  const updateForecastField = (field: string, value: any) => {
    setModalForecast(prev => prev ? { ...prev, [field]: value } : null);
    setIsFormDirty(true);
    validateField(field, value);
  };

  // Save forecast
  const handleSaveForecast = async () => {
    if (!modalForecast || !fss?.id) return;

    const errors = validateForecastForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error('Please fix the errors before saving');
      return;
    }

    try {
      const isNew = !modalForecast.id;
      const url = '/api/fss/forecasts';
      const method = isNew ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...modalForecast,
          fss_id: fss.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save forecast');
      }

      const savedForecast = await response.json();
      
      if (isNew) {
        setForecasts(prev => [...prev, savedForecast].sort((a, b) => a.forecast_year - b.forecast_year));
      } else {
        setForecasts(prev => prev.map(f => f.id === savedForecast.id ? savedForecast : f));
      }

      toast.success(isNew ? 'Forecast added' : 'Forecast updated');
      closeForecastModal();
      onFssChange?.(forecasts.length + (isNew ? 1 : 0));
    } catch (err: any) {
      console.error('[FSS Tab] Error saving forecast:', err);
      toast.error(err.message || 'Failed to save forecast');
    }
  };

  // Delete forecast
  const deleteForecast = async (forecastId: string) => {
    if (!confirm('Are you sure you want to delete this forecast?')) {
      return;
    }

    try {
      setDeleteLoading(forecastId);
      
      const response = await fetch(`/api/fss/forecasts?id=${forecastId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete forecast');
      }

      setForecasts(prev => prev.filter(f => f.id !== forecastId));
      toast.success('Forecast deleted');
      onFssChange?.(forecasts.length - 1);
    } catch (err) {
      console.error('[FSS Tab] Error deleting forecast:', err);
      toast.error('Failed to delete forecast');
    } finally {
      setDeleteLoading(null);
    }
  };

  // Calculate total USD
  const totalUSD = useMemo(() => {
    return forecasts.reduce((sum, f) => sum + (f.usd_amount || 0), 0);
  }, [forecasts]);

  // Handle FSS field changes
  const handleFssFieldChange = async (field: keyof ForwardSpendingSurvey, value: any) => {
    const updatedFss = { ...fss, [field]: value };
    setFss(updatedFss as ForwardSpendingSurvey);
    
    // Auto-save on blur (debounced)
    if (updatedFss.extraction_date) {
      await saveFss(updatedFss);
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Hero Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <HeroCard
          title="Total Forecasts"
          value={forecasts.length.toString()}
          subtitle="Forecast years"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <HeroCard
          title="Total Amount (USD)"
          value={`$${totalUSD.toLocaleString()}`}
          subtitle="Across all forecast years"
          icon={<span className="text-xl">💰</span>}
        />
        <HeroCard
          title="Phaseout Year"
          value={fss?.phaseout_year?.toString() || 'Not set'}
          subtitle="Expected end of funding"
          icon={<Calendar className="h-5 w-5" />}
        />
      </div>

      {/* FSS Form Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Forward Spending Survey Details</span>
            {fss && !isReadOnly && (
              <Button
                variant="destructive"
                size="sm"
                onClick={deleteFss}
                disabled={savingFss}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete FSS
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="extraction_date">
                Extraction Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="extraction_date"
                type="date"
                value={fss?.extraction_date || ''}
                onChange={(e) => handleFssFieldChange('extraction_date', e.target.value)}
                onBlur={() => {
                  if (fss?.extraction_date) {
                    saveFss(fss);
                  }
                }}
                disabled={isReadOnly || savingFss}
                required
              />
              <p className="text-xs text-muted-foreground">
                Date when forecast data was extracted
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority Level</Label>
              <Select
                value={fss?.priority?.toString() || ''}
                onValueChange={(value) => handleFssFieldChange('priority', value ? parseInt(value) : null)}
                disabled={isReadOnly || savingFss}
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {FSS_PRIORITY_LEVELS.map((level) => (
                    <SelectItem key={level.code} value={level.code.toString()}>
                      {level.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {fss?.priority && FSS_PRIORITY_LEVELS.find(l => l.code === fss.priority)?.description}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phaseout_year">Phaseout Year</Label>
              <Input
                id="phaseout_year"
                type="number"
                min="2000"
                max="2100"
                value={fss?.phaseout_year || ''}
                onChange={(e) => handleFssFieldChange('phaseout_year', e.target.value ? parseInt(e.target.value) : null)}
                onBlur={() => {
                  if (fss?.extraction_date) {
                    saveFss(fss);
                  }
                }}
                disabled={isReadOnly || savingFss}
                placeholder="e.g. 2030"
              />
              <p className="text-xs text-muted-foreground">
                Expected end year of funding
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={fss?.notes || ''}
              onChange={(e) => handleFssFieldChange('notes', e.target.value)}
              onBlur={() => {
                if (fss?.extraction_date) {
                  saveFss(fss);
                }
              }}
              disabled={isReadOnly || savingFss}
              placeholder="Additional notes about forward spending survey"
              rows={3}
            />
          </div>

          {savingFss && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Forecasts Section */}
      {fss?.id && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Forecast Years</span>
              {!isReadOnly && (
                <Button
                  size="sm"
                  onClick={() => openForecastModal()}
                  disabled={!fss?.id}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Forecast
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {forecasts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No forecasts yet</p>
                <p className="text-sm mb-4">Add forecast years to track forward spending</p>
                {!isReadOnly && (
                  <Button size="sm" onClick={() => openForecastModal()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Forecast
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Year</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>USD Amount</TableHead>
                    <TableHead>Value Date</TableHead>
                    {!isReadOnly && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forecasts.map((forecast) => (
                    <TableRow key={forecast.id}>
                      <TableCell className="font-medium">{forecast.forecast_year}</TableCell>
                      <TableCell>{forecast.amount.toLocaleString()}</TableCell>
                      <TableCell>{forecast.currency}</TableCell>
                      <TableCell className="font-medium">
                        ${(forecast.usd_amount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {forecast.value_date ? format(parseISO(forecast.value_date), 'MMM d, yyyy') : '-'}
                      </TableCell>
                      {!isReadOnly && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openForecastModal(forecast)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteForecast(forecast.id!)}
                              disabled={deleteLoading === forecast.id}
                            >
                              {deleteLoading === forecast.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* No FSS Yet State */}
      {!fss && !isReadOnly && (
        <Card>
          <CardContent className="py-12 text-center">
            <TrendingUp className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Forward Spending Survey</h3>
            <p className="text-muted-foreground mb-6">
              Create a Forward Spending Survey to track multi-year forecast spending commitments
            </p>
            <Button
              onClick={async () => {
                const today = format(new Date(), 'yyyy-MM-dd');
                const savedFss = await saveFss({ extraction_date: today, activity_id: activityId });
                setFss(savedFss);
              }}
              disabled={savingFss}
            >
              {savingFss ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Forward Spending Survey
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Forecast Modal */}
      <Dialog open={showForecastModal} onOpenChange={setShowForecastModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {modalForecast?.id ? 'Edit Forecast' : 'Add Forecast'}
            </DialogTitle>
            <DialogDescription>
              Enter forecast details for a specific year
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="forecast_year">
                  Forecast Year <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="forecast_year"
                  type="number"
                  min="2000"
                  max="2100"
                  value={modalForecast?.forecast_year || ''}
                  onChange={(e) => updateForecastField('forecast_year', parseInt(e.target.value))}
                  placeholder="e.g. 2025"
                />
                {fieldErrors.forecast_year && (
                  <p className="text-sm text-red-500">{fieldErrors.forecast_year}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">
                  Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={modalForecast?.amount || ''}
                  onChange={(e) => updateForecastField('amount', parseFloat(e.target.value))}
                  placeholder="0.00"
                />
                {fieldErrors.amount && (
                  <p className="text-sm text-red-500">{fieldErrors.amount}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">
                  Currency <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={modalForecast?.currency || 'USD'}
                  onValueChange={(value) => updateForecastField('currency', value)}
                >
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.code} - {currency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.currency && (
                  <p className="text-sm text-red-500">{fieldErrors.currency}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="value_date">
                  Value Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="value_date"
                  type="date"
                  value={modalForecast?.value_date || ''}
                  onChange={(e) => updateForecastField('value_date', e.target.value)}
                />
                {fieldErrors.value_date && (
                  <p className="text-sm text-red-500">{fieldErrors.value_date}</p>
                )}
              </div>
            </div>

            {modalForecast?.currency !== 'USD' && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">USD Amount:</span>
                  <span className="text-lg font-bold">
                    {isCalculatingUSD ? (
                      <Loader2 className="h-4 w-4 animate-spin inline" />
                    ) : (
                      `$${(modalForecast?.usd_amount || 0).toLocaleString()}`
                    )}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="forecast_notes">Notes</Label>
              <Textarea
                id="forecast_notes"
                value={modalForecast?.notes || ''}
                onChange={(e) => updateForecastField('notes', e.target.value)}
                placeholder="Additional notes about this forecast"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeForecastModal}>
              Cancel
            </Button>
            <Button onClick={handleSaveForecast} disabled={Object.keys(fieldErrors).length > 0}>
              {modalForecast?.id ? 'Update' : 'Add'} Forecast
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

