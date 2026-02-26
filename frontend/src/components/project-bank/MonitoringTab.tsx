"use client"

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CalendarClock, FileText, Loader2, Plus, CheckCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api-fetch';
import { MONITORING_STATUS_LABELS, COMPLIANCE_STATUS_LABELS } from '@/lib/project-bank-utils';
import type { MonitoringSchedule, MonitoringReport, ComplianceStatus } from '@/types/project-bank';

interface MonitoringTabProps {
  projectId: string;
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'amber',
  submitted: 'blue',
  under_review: 'purple',
  reviewed: 'success',
  overdue: 'destructive',
};

const COMPLIANCE_BADGE: Record<string, string> = {
  compliant: 'success',
  partially_compliant: 'amber',
  non_compliant: 'destructive',
  not_assessed: 'gray',
};

export function MonitoringTab({ projectId }: MonitoringTabProps) {
  const [schedule, setSchedule] = useState<MonitoringSchedule | null>(null);
  const [reports, setReports] = useState<MonitoringReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState<MonitoringReport | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState<MonitoringReport | null>(null);
  const [submitForm, setSubmitForm] = useState({ key_findings: '', recommendations: '' });
  const [reviewForm, setReviewForm] = useState({ compliance_status: 'not_assessed' as ComplianceStatus, review_notes: '' });

  const fetchData = async () => {
    try {
      const [schedRes, repRes] = await Promise.all([
        apiFetch(`/api/project-bank/${projectId}/monitoring`),
        apiFetch(`/api/project-bank/${projectId}/monitoring/reports`),
      ]);
      if (schedRes.ok) setSchedule(await schedRes.json());
      if (repRes.ok) setReports(await repRes.json());
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [projectId]);

  const activateMonitoring = async () => {
    setActionLoading(true);
    try {
      await apiFetch(`/api/project-bank/${projectId}/monitoring`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval_months: 6 }),
      });
      fetchData();
    } catch {} finally { setActionLoading(false); }
  };

  const toggleActive = async (isActive: boolean) => {
    try {
      await apiFetch(`/api/project-bank/${projectId}/monitoring`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive }),
      });
      fetchData();
    } catch {}
  };

  const submitReport = async () => {
    if (!showSubmitDialog) return;
    setActionLoading(true);
    try {
      await apiFetch(`/api/project-bank/${projectId}/monitoring/reports/${showSubmitDialog.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          key_findings: submitForm.key_findings,
          recommendations: submitForm.recommendations,
        }),
      });
      setShowSubmitDialog(null);
      setSubmitForm({ key_findings: '', recommendations: '' });
      fetchData();
    } catch {} finally { setActionLoading(false); }
  };

  const reviewReport = async () => {
    if (!showReviewDialog) return;
    setActionLoading(true);
    try {
      await apiFetch(`/api/project-bank/${projectId}/monitoring/reports/${showReviewDialog.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'review',
          compliance_status: reviewForm.compliance_status,
          review_notes: reviewForm.review_notes,
        }),
      });
      setShowReviewDialog(null);
      setReviewForm({ compliance_status: 'not_assessed', review_notes: '' });
      fetchData();
    } catch {} finally { setActionLoading(false); }
  };

  if (loading) {
    return <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded" />)}</div>;
  }

  if (!schedule) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CalendarClock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">Monitoring has not been activated for this project.</p>
          <Button onClick={activateMonitoring} disabled={actionLoading} className="gap-1.5">
            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Activate Monitoring
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Schedule Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="h-4 w-4" /> Monitoring Schedule
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Active</span>
              <Switch checked={schedule.is_active} onCheckedChange={toggleActive} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Interval</div>
              <div className="text-sm font-medium">Every {schedule.interval_months} months</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Next Due</div>
              <div className="text-sm font-medium">{schedule.next_due_date || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Status</div>
              <Badge variant={schedule.is_active ? 'success' : 'gray'}>
                {schedule.is_active ? 'Active' : 'Paused'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Report History</CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No reports yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Period</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Due Date</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Compliance</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Submitted</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reports.map(r => (
                    <tr key={r.id}>
                      <td className="py-2 px-2">
                        {r.report_period_start && r.report_period_end
                          ? `${r.report_period_start} — ${r.report_period_end}`
                          : '—'}
                      </td>
                      <td className="py-2 px-2">{r.due_date || '—'}</td>
                      <td className="py-2 px-2">
                        <Badge variant={STATUS_BADGE[r.status] as any || 'outline'}>
                          {MONITORING_STATUS_LABELS[r.status] || r.status}
                        </Badge>
                      </td>
                      <td className="py-2 px-2">
                        <Badge variant={COMPLIANCE_BADGE[r.compliance_status] as any || 'outline'}>
                          {COMPLIANCE_STATUS_LABELS[r.compliance_status] || r.compliance_status}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-muted-foreground">
                        {r.submitted_date ? new Date(r.submitted_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-2 px-2 text-right">
                        {r.status === 'pending' && (
                          <Button variant="outline" size="sm" onClick={() => {
                            setSubmitForm({ key_findings: '', recommendations: '' });
                            setShowSubmitDialog(r);
                          }}>
                            Submit
                          </Button>
                        )}
                        {r.status === 'submitted' && (
                          <Button variant="outline" size="sm" onClick={() => {
                            setReviewForm({ compliance_status: 'not_assessed', review_notes: '' });
                            setShowReviewDialog(r);
                          }}>
                            Review
                          </Button>
                        )}
                        {r.status === 'reviewed' && (
                          <CheckCircle className="h-4 w-4 text-green-500 inline" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit Report Dialog */}
      <Dialog open={!!showSubmitDialog} onOpenChange={() => setShowSubmitDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Submit Monitoring Report</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Key Findings</Label>
              <Textarea value={submitForm.key_findings} onChange={e => setSubmitForm(f => ({ ...f, key_findings: e.target.value }))} rows={3} />
            </div>
            <div>
              <Label>Recommendations</Label>
              <Textarea value={submitForm.recommendations} onChange={e => setSubmitForm(f => ({ ...f, recommendations: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(null)}>Cancel</Button>
            <Button onClick={submitReport} disabled={actionLoading}>
              {actionLoading ? 'Submitting...' : 'Submit Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Report Dialog */}
      <Dialog open={!!showReviewDialog} onOpenChange={() => setShowReviewDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Review Monitoring Report</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Compliance Status</Label>
              <Select value={reviewForm.compliance_status} onValueChange={v => setReviewForm(f => ({ ...f, compliance_status: v as ComplianceStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(COMPLIANCE_STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Review Notes</Label>
              <Textarea value={reviewForm.review_notes} onChange={e => setReviewForm(f => ({ ...f, review_notes: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(null)}>Cancel</Button>
            <Button onClick={reviewReport} disabled={actionLoading}>
              {actionLoading ? 'Saving...' : 'Save Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
