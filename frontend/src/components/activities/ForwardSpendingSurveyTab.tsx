'use client';

import { RequiredDot } from "@/components/ui/required-dot";
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { Trash2, Plus, Loader2, Pencil, Save, X, AlertCircle, CheckCircle, TrendingUp, HelpCircle, RefreshCw, Info } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
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
import { convertToUSD } from '@/lib/currency-conversion-api';
import { fixedCurrencyConverter } from '@/lib/currency-converter-fixed';
import { Switch } from '@/components/ui/switch';
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
import { apiFetch } from '@/lib/api-fetch';

interface ForwardSpendingSurveyTabProps {
  activityId: string;
  readOnly?: boolean;
  onFssChange?: (count: number) => void;
}


export default function ForwardSpendingSurveyTab({ 
  activityId, 
  readOnly = false,
  onFssChange
}: ForwardSpendingSurveyTabProps) {
  const { confirm, ConfirmDialog } = useConfirmDialog();
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
  const [modalExchangeRateManual, setModalExchangeRateManual] = useState(false);
  const [modalExchangeRate, setModalExchangeRate] = useState<number | null>(null);
  const [isLoadingModalRate, setIsLoadingModalRate] = useState(false);
  const [modalRateError, setModalRateError] = useState<string | null>(null);

  // USD conversion tracking
  const [usdValues, setUsdValues] = useState<Record<string, { 
    usd: number | null, 
    rate: number | null, 
    date: string, 
    loading: boolean, 
    error?: string 
  }>>({});

  // Get all currencies
  const currencies = useMemo(() => getAllCurrenciesWithPinned(), []);

  // Fetch FSS and forecasts
  const fetchFssData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[FSS Tab] Fetching FSS for activity:', activityId);

      const response = await apiFetch(`/api/activities/${activityId}/fss`);
      if (!response.ok) {
        throw new Error('Failed to fetch FSS data');
      }

      const data = await response.json();
      
      if (data) {
        setFss(data);
        setForecasts(data.forecasts || []);
        console.log('[FSS Tab] Loaded FSS with', data.forecasts?.length || 0, 'forecasts');
      } else {
        setFss(null);
        setForecasts([]);
      }
    } catch (err) {
      console.error('[FSS Tab] Error fetching FSS:', err);
      setError('Failed to load forward spending survey data');
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  useEffect(() => {
    if (activityId) {
      fetchFssData();
    }
  }, [activityId, fetchFssData]);

  // Stable ref for callback to avoid infinite re-render loop
  const onFssChangeRef = useRef(onFssChange);
  onFssChangeRef.current = onFssChange;

  // Notify parent component when forecasts change (only after initial load)
  // This prevents the green tick from disappearing when switching tabs
  useEffect(() => {
    if (onFssChangeRef.current && !loading) {
      const count = forecasts.length > 0 ? 1 : 0;
      console.log('[FSS Tab] Notifying parent with forecast count:', count);
      onFssChangeRef.current(count);
    }
  }, [forecasts, loading]);

  // Read stored USD values from database (no conversion needed)
  useEffect(() => {
    const newUsdValues: Record<string, { usd: number|null, rate: number|null, date: string, loading: boolean, error?: string }> = {};
    for (const forecast of forecasts) {
      const key = forecast.id || '';
      newUsdValues[key] = {
        usd: forecast.usd_amount ?? null,
        rate: null,
        date: forecast.value_date || '',
        loading: false,
        error: forecast.usd_amount === null && forecast.currency !== 'USD' ? 'Not converted' : undefined
      };
    }
    setUsdValues(newUsdValues);
  }, [forecasts]);

  // Save FSS (extraction date, priority, phaseout year)
  const saveFss = async (updatedFss: Partial<ForwardSpendingSurvey>) => {
    try {
      setSavingFss(true);
      console.log('[FSS Tab] Saving FSS:', updatedFss);

      const response = await apiFetch(`/api/activities/${activityId}/fss`, {
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
    if (!(await confirm({ title: 'Delete Forward Spending Survey?', description: 'This will remove all forecasts. This action cannot be undone.', confirmLabel: 'Delete', cancelLabel: 'Cancel' }))) {
      return;
    }

    try {
      const response = await apiFetch(`/api/activities/${activityId}/fss`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete FSS');
      }

      setFss(null);
      setForecasts([]);
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

  const closeForecastModal = async () => {
    if (isFormDirty) {
      if (await confirm({ title: 'Discard unsaved changes?', description: 'You have unsaved changes in this forecast. Closing now will discard all changes.', confirmLabel: 'Discard Changes', cancelLabel: 'Keep Editing' })) {
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

  // Fetch exchange rate for modal
  const fetchModalExchangeRate = useCallback(async () => {
    if (!modalForecast) return;
    const currency = modalForecast.currency;
    if (!currency) return;

    if (currency === 'USD') {
      setModalExchangeRate(1);
      setModalRateError(null);
      return;
    }

    const valueDate = modalForecast.value_date;
    if (!valueDate) {
      setModalRateError('Please set a value date first');
      return;
    }

    setIsLoadingModalRate(true);
    setModalRateError(null);
    try {
      const result = await fixedCurrencyConverter.convertToUSD(1, currency, new Date(valueDate));
      if (result.success && result.exchange_rate) {
        setModalExchangeRate(result.exchange_rate);
        setModalRateError(null);
      } else {
        setModalRateError(result.error || 'Failed to fetch exchange rate');
        setModalExchangeRate(null);
      }
    } catch (err) {
      console.error('[FSS Tab] Error fetching exchange rate:', err);
      setModalRateError('Failed to fetch exchange rate');
      setModalExchangeRate(null);
    } finally {
      setIsLoadingModalRate(false);
    }
  }, [modalForecast?.currency, modalForecast?.value_date]);

  // Calculated USD value
  const modalCalculatedUsdValue = modalForecast?.amount && modalExchangeRate
    ? Math.round(modalForecast.amount * modalExchangeRate * 100) / 100
    : null;

  // Auto-fetch exchange rate when currency or date changes (only if not manual)
  useEffect(() => {
    if (!modalExchangeRateManual && modalForecast?.currency) {
      if (modalForecast.currency === 'USD') {
        setModalExchangeRate(1);
        setModalRateError(null);
      } else if (modalForecast.value_date) {
        fetchModalExchangeRate();
      }
    }
  }, [modalForecast?.currency, modalForecast?.value_date, modalExchangeRateManual, fetchModalExchangeRate]);

  // Sync calculatedUsdValue back into modalForecast.usd_amount for save
  useEffect(() => {
    if (modalCalculatedUsdValue !== null && modalForecast) {
      setModalForecast(prev => prev ? { ...prev, usd_amount: modalCalculatedUsdValue } : null);
    }
  }, [modalCalculatedUsdValue]);

  // Reset exchange rate state when modal opens
  useEffect(() => {
    if (showForecastModal && modalForecast) {
      setModalExchangeRateManual(false);
      setModalExchangeRate(null);
      setModalRateError(null);
    }
  }, [showForecastModal, modalForecast?.id]);

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
    } catch (err: any) {
      console.error('[FSS Tab] Error saving forecast:', err);
      toast.error(err.message || 'Failed to save forecast');
    }
  };

  // Delete forecast
  const deleteForecast = async (forecastId: string) => {
    if (!(await confirm({ title: 'Delete this forecast?', description: 'This action cannot be undone.', confirmLabel: 'Delete', cancelLabel: 'Cancel' }))) {
      return;
    }

    try {
      setDeleteLoading(forecastId);
      
      const response = await apiFetch(`/api/fss/forecasts?id=${forecastId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete forecast');
      }

      setForecasts(prev => prev.filter(f => f.id !== forecastId));
      toast.success('Forecast deleted');
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
      {/* FSS Form Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {fss && !isReadOnly && (
              <Button
                variant="destructive"
                size="sm"
                onClick={deleteFss}
                disabled={savingFss}
              >
                <Trash2 className="h-4 w-4 mr-2 text-white" />
                Delete FSS
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="extraction_date" className="flex items-center gap-2">
                Extraction Date <RequiredDot />
                <HelpTextTooltip content="Date when forecast data was extracted">
                  <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help" />
                </HelpTextTooltip>
              </Label>
              <DatePicker
                value={fss?.extraction_date || ''}
                onChange={(value) => {
                  handleFssFieldChange('extraction_date', value);
                  if (value) {
                    saveFss({ ...fss, extraction_date: value });
                  }
                }}
                placeholder="Select extraction date"
                disabled={isReadOnly || savingFss}
                dropdownId="fss-extraction-date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority" className="flex items-center gap-2">
                Priority Level
                <HelpTextTooltip content="Moderate confidence in funding">
                  <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help" />
                </HelpTextTooltip>
              </Label>
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
                    <SelectItem key={level.code} value={level.code.toString()} className="pl-2">
                      {level.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phaseout_year" className="flex items-center gap-2">
                Phaseout Year
                <HelpTextTooltip content="Expected end year of funding">
                  <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help" />
                </HelpTextTooltip>
              </Label>
              <Select
                value={fss?.phaseout_year?.toString() || ''}
                onValueChange={(value) => {
                  handleFssFieldChange('phaseout_year', value ? parseInt(value) : null);
                  if (fss?.extraction_date) {
                    saveFss({ ...fss, phaseout_year: value ? parseInt(value) : null });
                  }
                }}
                disabled={isReadOnly || savingFss}
              >
                <SelectTrigger id="phaseout_year">
                  <SelectValue placeholder="Select phaseout year" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 101 }, (_, i) => {
                    const year = 2000 + i;
                    return (
                      <SelectItem key={year} value={year.toString()} className="pl-2">
                        {year}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
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
              <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No forecasts</h3>
                <p className="text-muted-foreground mb-4">Use the button above to add your first forecast year.</p>
                {!isReadOnly && (
                  <Button size="sm" onClick={() => openForecastModal()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Forecast
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="py-3 px-4 w-1/5">Year</TableHead>
                      <TableHead className="py-3 px-4 text-right w-1/5">Amount</TableHead>
                      <TableHead className="py-3 px-4 w-1/5">Value Date</TableHead>
                      <TableHead className="py-3 px-4 text-right w-1/5">USD Value</TableHead>
                      {!isReadOnly && <TableHead className="py-3 px-4 text-center w-1/5" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {forecasts.map((forecast) => (
                      <TableRow 
                        key={forecast.id}
                        className="border-b border-border/40 hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="py-3 px-4 font-medium">{forecast.forecast_year}</TableCell>
                        <TableCell className="py-3 px-4 text-right font-medium">
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded mr-1.5">{forecast.currency}</span>
                          {forecast.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          {forecast.value_date ? format(parseISO(forecast.value_date), 'd MMMM yyyy') : '-'}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-right font-medium">
                          <div className="flex items-center justify-end gap-1">
                            {usdValues[forecast.id || '']?.loading ? (
                              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                            ) : usdValues[forecast.id || '']?.usd != null ? (
                              <TooltipProvider>
                                <UITooltip>
                                  <TooltipTrigger asChild>
                                    <span className="font-medium cursor-help">
                                      <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded mr-1.5">USD</span>
                                      {usdValues[forecast.id || ''].usd?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div>
                                      <div>Original: {forecast.amount.toLocaleString()} {forecast.currency}</div>
                                      <div>Rate: {usdValues[forecast.id || ''].rate}</div>
                                      <div>Date: {usdValues[forecast.id || ''].date}</div>
                                    </div>
                                  </TooltipContent>
                                </UITooltip>
                              </TooltipProvider>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>
                        {!isReadOnly && (
                          <TableCell className="py-3 px-4 text-center">
                            <div className="flex justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openForecastModal(forecast)}
                              >
                                <Pencil className="h-4 w-4 text-slate-500" />
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
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* No FSS Yet State */}
      {!fss && !isReadOnly && (
        <Card>
          <CardContent className="py-12 text-center">
            <img src="/images/empty-seed-packet.webp" alt="No Forward Spending Survey" className="h-32 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Forward Spending Survey</h3>
            <p className="text-muted-foreground mb-6">
              Create a Forward Spending Survey to track multi-year forecast spending commitments.
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
                  Forecast Year <RequiredDot />
                </Label>
                <Select
                  value={modalForecast?.forecast_year?.toString() || ''}
                  onValueChange={(value) => updateForecastField('forecast_year', parseInt(value))}
                >
                  <SelectTrigger id="forecast_year">
                    <SelectValue placeholder="Select forecast year" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 101 }, (_, i) => {
                      const year = 2000 + i;
                      return (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {fieldErrors.forecast_year && (
                  <p className="text-sm text-red-500">{fieldErrors.forecast_year}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">
                  Amount <RequiredDot />
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
                  Currency <RequiredDot />
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
                  Value Date <RequiredDot />
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

            {/* Exchange Rate & USD Value */}
            {modalForecast?.currency && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between min-h-[24px]">
                    <Label className="flex items-center gap-1.5 text-sm font-medium">
                      Exchange Rate
                      <TooltipProvider>
                        <UITooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-sm">The exchange rate used to convert the forecast value to USD. Automatically fetched from historical rates based on the value date. Toggle the switch to enter a manual rate instead.</p>
                          </TooltipContent>
                        </UITooltip>
                      </TooltipProvider>
                    </Label>
                    {modalForecast.currency !== 'USD' && (
                      <div className="flex items-center gap-2">
                        <Label htmlFor="fss_exchange_rate_mode" className="text-xs text-muted-foreground cursor-pointer">
                          {modalExchangeRateManual ? 'Manual' : 'Auto'}
                        </Label>
                        <Switch
                          id="fss_exchange_rate_mode"
                          checked={!modalExchangeRateManual}
                          onCheckedChange={(checked) => {
                            setModalExchangeRateManual(!checked);
                            if (checked) {
                              fetchModalExchangeRate();
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.000001"
                      value={modalExchangeRate || ''}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        setModalExchangeRate(isNaN(value) ? null : value);
                      }}
                      disabled={!modalExchangeRateManual || isLoadingModalRate || modalForecast.currency === 'USD'}
                      className={cn(
                        (!modalExchangeRateManual || modalForecast.currency === 'USD') && 'bg-muted cursor-not-allowed'
                      )}
                      placeholder={isLoadingModalRate ? 'Loading...' : 'Enter rate'}
                    />
                    {isLoadingModalRate && (
                      <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {!isLoadingModalRate && !modalExchangeRateManual && modalForecast.currency !== 'USD' && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1 h-8 w-8 p-0"
                        onClick={fetchModalExchangeRate}
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    )}
                    {modalExchangeRate != null && modalForecast.currency !== 'USD' && !isLoadingModalRate && (
                      <span className="absolute right-10 top-2.5 text-xs text-muted-foreground select-all cursor-text">
                        1 {modalForecast.currency} = {modalExchangeRate.toFixed(6)} USD
                      </span>
                    )}
                  </div>
                  {modalRateError && (
                    <p className="text-xs text-red-500">{modalRateError}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center min-h-[24px]">
                    <Label className="flex items-center gap-1.5 text-sm font-medium">
                      USD Value
                      <TooltipProvider>
                        <UITooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-sm">The forecast value converted to US Dollars using the exchange rate shown. This is calculated automatically from the original value and exchange rate.</p>
                          </TooltipContent>
                        </UITooltip>
                      </TooltipProvider>
                    </Label>
                  </div>
                  <div className="h-10 px-3 py-2 border rounded-md bg-muted flex items-center text-sm">
                    {modalCalculatedUsdValue !== null ? (
                      <>$ {modalCalculatedUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
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
      <ConfirmDialog />
    </div>
  );
}

