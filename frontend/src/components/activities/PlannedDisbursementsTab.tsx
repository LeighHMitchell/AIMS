'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format, parseISO, isValid, addMonths, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, differenceInMonths } from 'date-fns';
import { Trash2, Copy, Loader2, Plus, CalendarIcon, Download, Filter, DollarSign, Users, Edit } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAllCurrenciesWithPinned, type Currency } from '@/data/currencies';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// Types
interface PlannedDisbursement {
  id?: string;
  activity_id: string;
  amount: number;
  currency: string;
  period_start: string;
  period_end: string;
  provider_org_id?: string;
  provider_org_name?: string;
  receiver_org_id?: string;
  receiver_org_name?: string;
  status?: 'original' | 'revised';
  value_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  isSaving?: boolean;
  hasError?: boolean;
}

interface PlannedDisbursementsTabProps {
  activityId: string;
  startDate: string;
  endDate: string;
  defaultCurrency?: string;
  readOnly?: boolean;
}

interface Organization {
  id: string;
  name?: string;
  code?: string;
  acronym?: string;
  type?: string;
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

// Planned Disbursement Modal Component
interface PlannedDisbursementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disbursement: PlannedDisbursement | null;
  activityId: string;
  onSubmit: (disbursement: PlannedDisbursement) => void;
  isSubmitting: boolean;
  defaultCurrency: string;
  startDate: string;
  endDate: string;
  organizations: Organization[];
}

function PlannedDisbursementModal({
  open,
  onOpenChange,
  disbursement,
  activityId,
  onSubmit,
  isSubmitting,
  defaultCurrency,
  startDate,
  endDate,
  organizations
}: PlannedDisbursementModalProps) {
  const [formData, setFormData] = useState<PlannedDisbursement>({
    activity_id: activityId,
    amount: 0,
    currency: defaultCurrency,
    period_start: startDate || format(new Date(), 'yyyy-MM-dd'),
    period_end: endDate || format(addMonths(new Date(), 3), 'yyyy-MM-dd'),
    status: 'original',
    provider_org_name: '',
    receiver_org_name: '',
    value_date: '',
    notes: ''
  });

  // Get all currencies
  const currencies = useMemo(() => getAllCurrenciesWithPinned(), []);

  // Format organization display
  const formatOrgDisplay = (org: Organization) => {
    // Show Name (Acronym) format if both exist and are different
    if (org.name && org.acronym && org.name !== org.acronym) {
      return `${org.name} (${org.acronym})`;
    }
    return org.name || 'Unknown';
  };

  useEffect(() => {
    if (disbursement) {
      setFormData(disbursement);
    } else {
      setFormData({
        activity_id: activityId,
        amount: 0,
        currency: defaultCurrency,
        period_start: startDate || format(new Date(), 'yyyy-MM-dd'),
        period_end: endDate || format(addMonths(new Date(), 3), 'yyyy-MM-dd'),
        status: 'original',
        provider_org_name: '',
        receiver_org_name: '',
        value_date: '',
        notes: ''
      });
    }
  }, [disbursement, activityId, defaultCurrency, startDate, endDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {disbursement ? 'Edit Planned Disbursement' : 'Add Planned Disbursement'}
          </DialogTitle>
          <DialogDescription>
            Enter the details for the planned disbursement. All fields marked with * are required.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                required
                min="0"
                step="0.01"
              />
            </div>

            {/* Currency */}
            <div className="space-y-2">
              <Label htmlFor="currency">Currency *</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, currency: value })}
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map(currency => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.code} - {currency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Period Start */}
            <div className="space-y-2">
              <Label htmlFor="period_start">Period Start *</Label>
              <Input
                id="period_start"
                type="date"
                value={formData.period_start}
                onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                required
              />
            </div>

            {/* Period End */}
            <div className="space-y-2">
              <Label htmlFor="period_end">Period End *</Label>
              <Input
                id="period_end"
                type="date"
                value={formData.period_end}
                onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                required
              />
            </div>

            {/* Provider Organization */}
            <div className="space-y-2">
              <Label htmlFor="provider_org">Provider Organization</Label>
              <Select
                value={formData.provider_org_id || 'none'}
                onValueChange={(value) => {
                  if (value === 'none') {
                    setFormData({ 
                      ...formData, 
                      provider_org_id: undefined,
                      provider_org_name: ''
                    });
                  } else {
                    const org = organizations.find(o => o.id === value);
                    if (org) {
                      setFormData({ 
                        ...formData, 
                        provider_org_id: org.id,
                        provider_org_name: formatOrgDisplay(org)
                      });
                    }
                  }
                }}
              >
                <SelectTrigger id="provider_org">
                  <SelectValue placeholder="Select provider organization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {organizations.map(org => (
                    <SelectItem key={org.id} value={org.id}>
                      {formatOrgDisplay(org)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Receiver Organization */}
            <div className="space-y-2">
              <Label htmlFor="receiver_org">Receiver Organization</Label>
              <Select
                value={formData.receiver_org_id || 'none'}
                onValueChange={(value) => {
                  if (value === 'none') {
                    setFormData({ 
                      ...formData, 
                      receiver_org_id: undefined,
                      receiver_org_name: ''
                    });
                  } else {
                    const org = organizations.find(o => o.id === value);
                    if (org) {
                      setFormData({ 
                        ...formData, 
                        receiver_org_id: org.id,
                        receiver_org_name: formatOrgDisplay(org)
                      });
                    }
                  }
                }}
              >
                <SelectTrigger id="receiver_org">
                  <SelectValue placeholder="Select receiver organization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {organizations.map(org => (
                    <SelectItem key={org.id} value={org.id}>
                      {formatOrgDisplay(org)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status || 'original'}
                onValueChange={(value) => setFormData({ ...formData, status: value as 'original' | 'revised' })}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="original">Original</SelectItem>
                  <SelectItem value="revised">Revised</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Value Date */}
            <div className="space-y-2">
              <Label htmlFor="value_date">Value Date (Optional)</Label>
              <Input
                id="value_date"
                type="date"
                value={formData.value_date || ''}
                onChange={(e) => setFormData({ ...formData, value_date: e.target.value })}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any additional notes..."
              rows={3}
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {disbursement ? 'Update' : 'Add'} Disbursement
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function PlannedDisbursementsTab({ 
  activityId, 
  startDate, 
  endDate, 
  defaultCurrency = 'USD',
  readOnly = false 
}: PlannedDisbursementsTabProps) {
  const [disbursements, setDisbursements] = useState<PlannedDisbursement[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingDisbursement, setEditingDisbursement] = useState<PlannedDisbursement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: 'all',
    dateFrom: '',
    dateTo: ''
  });

  // Get all currencies
  const currencies = useMemo(() => getAllCurrenciesWithPinned(), []);

  // Fetch organizations for autocomplete
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name, code, acronym, type')
          .order('name');

        if (error) throw error;

        setOrganizations(data || []);
      } catch (err) {
        console.error('Error fetching organizations:', err);
      }
    };

    fetchOrganizations();
  }, []);

  // Fetch disbursements for this activity
  useEffect(() => {
    const fetchDisbursements = async () => {
      // Don't fetch if no activityId (new unsaved activity)
      if (!activityId) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('planned_disbursements')
          .select('*')
          .eq('activity_id', activityId)
          .order('period_start', { ascending: true });

        if (error) throw error;

        setDisbursements(data || []);
      } catch (err) {
        console.error('Error fetching planned disbursements:', err);
        setError('Failed to load planned disbursements');
      } finally {
        setLoading(false);
      }
    };

    fetchDisbursements();
  }, [activityId]);

  // Filter disbursements
  const filteredDisbursements = useMemo(() => {
    return disbursements.filter(d => {
      if (filters.status !== 'all' && d.status !== filters.status) return false;
      if (filters.dateFrom && d.period_start < filters.dateFrom) return false;
      if (filters.dateTo && d.period_end > filters.dateTo) return false;
      return true;
    });
  }, [disbursements, filters]);

  // Calculate total planned disbursements
  const totalPlanned = useMemo(() => {
    return filteredDisbursements.reduce((sum, d) => sum + Number(d.amount), 0);
  }, [filteredDisbursements]);

  // Calculate hero card statistics
  const heroStats = useMemo(() => {
    const sortedDisbursements = [...filteredDisbursements].sort((a, b) => 
      parseISO(a.period_start).getTime() - parseISO(b.period_start).getTime()
    );

    // Time coverage
    const firstDisbursement = sortedDisbursements[0];
    const lastDisbursement = sortedDisbursements[sortedDisbursements.length - 1];
    const timeCoverage = firstDisbursement && lastDisbursement
      ? `${format(parseISO(firstDisbursement.period_start), 'MMM yyyy')} – ${format(parseISO(lastDisbursement.period_end), 'MMM yyyy')}`
      : 'No periods';

    // Status breakdown
    const originalCount = filteredDisbursements.filter(d => d.status === 'original').length;
    const revisedCount = filteredDisbursements.filter(d => d.status === 'revised').length;
    const statusText = [];
    if (originalCount > 0) statusText.push(`${originalCount} Original`);
    if (revisedCount > 0) statusText.push(`${revisedCount} Revised`);

    // Organizations involved
    const providerOrgs = Array.from(new Set(filteredDisbursements.map(d => d.provider_org_name).filter(Boolean)));
    const receiverOrgs = Array.from(new Set(filteredDisbursements.map(d => d.receiver_org_name).filter(Boolean)));

    return {
      totalPlanned: totalPlanned.toLocaleString(),
      timeCoverage,
      statusText: statusText.join(' • ') || 'No disbursements',
      providerCount: providerOrgs.length,
      receiverCount: receiverOrgs.length,
      mainCurrency: filteredDisbursements[0]?.currency || defaultCurrency
    };
  }, [filteredDisbursements, totalPlanned, defaultCurrency]);

  // Calculate chart data
  const chartData = useMemo(() => {
    const sortedDisbursements = [...filteredDisbursements].sort((a, b) => 
      parseISO(a.period_start).getTime() - parseISO(b.period_start).getTime()
    );

    // Group by quarter
    const quarterlyData = sortedDisbursements.map(d => ({
      period: format(parseISO(d.period_start), 'MMM yyyy'),
      amount: Number(d.amount)
    }));

    // Calculate cumulative
    let cumulative = 0;
    const cumulativeData = quarterlyData.map(item => {
      cumulative += item.amount;
      return {
        period: item.period,
        amount: item.amount,
        cumulative
      };
    });

    return cumulativeData;
  }, [filteredDisbursements]);

  // Handle submit from modal
  const handleSubmit = async (formData: PlannedDisbursement) => {
    if (readOnly) return;
    
    setSubmitting(true);
    try {
      if (!formData.amount || formData.amount <= 0) {
        throw new Error("Amount must be greater than 0");
      }

      const disbursementData = {
        activity_id: activityId,
        amount: formData.amount,
        currency: formData.currency,
        period_start: formData.period_start,
        period_end: formData.period_end,
        provider_org_id: formData.provider_org_id,
        provider_org_name: formData.provider_org_name,
        receiver_org_id: formData.receiver_org_id,
        receiver_org_name: formData.receiver_org_name,
        status: formData.status,
        value_date: formData.value_date,
        notes: formData.notes,
      };

      if (editingDisbursement?.id) {
        // Update existing
        const { data, error } = await supabase
          .from('planned_disbursements')
          .update(disbursementData)
          .eq('id', editingDisbursement.id)
          .select()
          .single();

        if (error) throw error;

        setDisbursements(prev => prev.map(d => 
          d.id === editingDisbursement.id ? data : d
        ));
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('planned_disbursements')
          .insert(disbursementData)
          .select()
          .single();

        if (error) throw error;

        setDisbursements(prev => [...prev, data]);
      }

      setShowModal(false);
      setEditingDisbursement(null);
    } catch (err: any) {
      console.error('Error saving planned disbursement:', err);
      setError(err.message || 'Failed to save planned disbursement');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle edit
  const handleEdit = (disbursement: PlannedDisbursement) => {
    setEditingDisbursement(disbursement);
    setShowModal(true);
  };

  // Delete disbursement
  const handleDelete = async (id: string) => {
    if (readOnly) return;

    if (!confirm('Are you sure you want to delete this planned disbursement?')) return;

    setDeleteLoading(id);
    try {
      const { error } = await supabase
        .from('planned_disbursements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setDisbursements(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      console.error('Error deleting planned disbursement:', err);
      setError('Failed to delete planned disbursement');
    } finally {
      setDeleteLoading(null);
    }
  };

  // Duplicate disbursement
  const handleDuplicate = (disbursement: PlannedDisbursement) => {
    if (readOnly) return;

    const newDisbursement: PlannedDisbursement = {
      ...disbursement,
      id: undefined,
      period_start: format(addMonths(parseISO(disbursement.period_start), 3), 'yyyy-MM-dd'),
      period_end: format(addMonths(parseISO(disbursement.period_end), 3), 'yyyy-MM-dd'),
    };

    setEditingDisbursement(newDisbursement);
    setShowModal(true);
  };

  // Export to CSV
  const handleExport = () => {
    const dataToExport = filteredDisbursements.map(d => ({
      amount: d.amount,
      currency: d.currency,
      period_start: d.period_start,
      period_end: d.period_end,
      provider_org: d.provider_org_name || '',
      receiver_org: d.receiver_org_name || '',
      status: d.status || 'original',
      value_date: d.value_date || '',
      notes: d.notes || ''
    }));

    const csv = [
      Object.keys(dataToExport[0] || {}).join(","),
      ...dataToExport.map(row => Object.values(row).map(v => `"${v}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `planned-disbursements-${activityId}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getOrganizationDisplayName = (org: Organization | null) => {
    if (!org) return 'Unknown';
    // Show Name (Acronym) format if both exist and are different
    if (org.name && org.acronym && org.name !== org.acronym) {
      return `${org.name} (${org.acronym})`;
    }
    return org.name || 'Unknown';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // Show message if activity hasn't been saved yet
  if (!activityId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-2">Please save the activity first before adding planned disbursements.</p>
        <p className="text-sm text-gray-400">Planned disbursements can only be added to saved activities.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Hero Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <HeroCard
          title="Total Planned"
          value={`${heroStats.mainCurrency} ${heroStats.totalPlanned}`}
          subtitle={`Across ${filteredDisbursements.length} disbursements`}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <HeroCard
          title="Time Coverage"
          value={heroStats.timeCoverage}
          subtitle={heroStats.statusText}
          icon={<CalendarIcon className="h-5 w-5" />}
        />
        <HeroCard
          title="Organizations"
          value={`${heroStats.providerCount + heroStats.receiverCount}`}
          subtitle={`${heroStats.providerCount} providers, ${heroStats.receiverCount} receivers`}
          icon={<Users className="h-5 w-5" />}
        />
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Planned Disbursement Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} stroke="#6B7280" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#6B7280" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #E5E7EB',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }} 
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6', r: 4 }}
                    name="Amount" 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cumulative" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    dot={{ fill: '#10B981', r: 4 }}
                    name="Cumulative" 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disbursements Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Planned Disbursements</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage IATI-compliant planned disbursements
              </p>
            </div>
            <div className="flex gap-2">
              {!readOnly && (
                <Button onClick={() => {
                  setEditingDisbursement(null);
                  setShowModal(true);
                }}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Disbursement
                </Button>
              )}
              {disbursements.length > 0 && (
                <Button variant="outline" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          {disbursements.length > 0 && (
            <div className="mb-4 p-4 bg-muted/50 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Filter className="h-4 w-4" />
                Filters
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Select value={filters.status} onValueChange={v => setFilters({...filters, status: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="original">Original</SelectItem>
                    <SelectItem value="revised">Revised</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Input
                    type="date"
                    placeholder="From date"
                    value={filters.dateFrom}
                    onChange={e => setFilters({...filters, dateFrom: e.target.value})}
                    className="pl-8"
                  />
                  <label className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">From</label>
                </div>
                <div className="relative">
                  <Input
                    type="date"
                    placeholder="To date"
                    value={filters.dateTo}
                    onChange={e => setFilters({...filters, dateTo: e.target.value})}
                    className="pl-8"
                  />
                  <label className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">To</label>
                </div>
              </div>
              {(filters.status !== 'all' || filters.dateFrom || filters.dateTo) && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilters({ status: 'all', dateFrom: '', dateTo: '' })}
                    className="text-xs"
                  >
                    Clear all filters
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Showing {filteredDisbursements.length} of {disbursements.length} disbursements
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Table */}
          {filteredDisbursements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {disbursements.length === 0 
                ? "No planned disbursements have been added yet." 
                : "No disbursements match the current filters."}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Receiver</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDisbursements.map((disbursement) => (
                    <TableRow 
                      key={disbursement.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleEdit(disbursement)}
                    >
                      <TableCell className="font-medium">
                        {format(parseISO(disbursement.period_start), 'MMM yyyy')} - {format(parseISO(disbursement.period_end), 'MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        {disbursement.currency} {disbursement.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>{disbursement.provider_org_name || '-'}</TableCell>
                      <TableCell>{disbursement.receiver_org_name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={disbursement.status === 'revised' ? 'default' : 'secondary'}>
                          {disbursement.status || 'Original'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {!readOnly && (
                          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <TooltipProvider>
                              <UITooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEdit(disbursement);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit</TooltipContent>
                              </UITooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <UITooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDuplicate(disbursement);
                                    }}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Duplicate</TooltipContent>
                              </UITooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <UITooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (disbursement.id) handleDelete(disbursement.id);
                                    }}
                                    className="text-red-600 hover:text-red-700"
                                    disabled={deleteLoading === disbursement.id}
                                  >
                                    {deleteLoading === disbursement.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete</TooltipContent>
                              </UITooltip>
                            </TooltipProvider>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Total */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Planned:</span>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-lg font-bold">
                      {heroStats.mainCurrency} {totalPlanned.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      <PlannedDisbursementModal
        open={showModal}
        onOpenChange={(open) => {
          setShowModal(open);
          if (!open) setEditingDisbursement(null);
        }}
        disbursement={editingDisbursement}
        activityId={activityId}
        onSubmit={handleSubmit}
        isSubmitting={submitting}
        defaultCurrency={defaultCurrency}
        startDate={startDate}
        endDate={endDate}
        organizations={organizations}
      />
    </div>
  );
}
