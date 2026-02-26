"use client"

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { ArrowRight, Plus, Star, Trash2, Loader2, CheckCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api-fetch';
import { PROPOSAL_STATUS_LABELS, formatCurrency } from '@/lib/project-bank-utils';
import type { UnsolicitedProposal, ProposalBidder, ProposalStatus } from '@/types/project-bank';
import { cn } from '@/lib/utils';

interface SwissChallengeTabProps {
  projectId: string;
}

const PROPOSAL_STEPS: ProposalStatus[] = [
  'received', 'under_review', 'rfp_published', 'counter_proposals_open', 'evaluation', 'awarded',
];

const STATUS_BADGE_VARIANT: Record<string, string> = {
  submitted: 'blue',
  under_review: 'amber',
  shortlisted: 'purple',
  rejected: 'destructive',
  winner: 'success',
};

export function SwissChallengeTab({ projectId }: SwissChallengeTabProps) {
  const [proposal, setProposal] = useState<UnsolicitedProposal | null>(null);
  const [bidders, setBidders] = useState<ProposalBidder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showAddBidder, setShowAddBidder] = useState(false);
  const [showScoreBidder, setShowScoreBidder] = useState<ProposalBidder | null>(null);
  const [bidderForm, setBidderForm] = useState({ company_name: '', contact_name: '', contact_email: '', bid_amount: '' });
  const [scoreForm, setScoreForm] = useState({ evaluation_score: '', evaluation_notes: '' });

  const fetchData = async () => {
    try {
      const [propRes, bidRes] = await Promise.all([
        apiFetch(`/api/project-bank/${projectId}/unsolicited-proposal`),
        apiFetch(`/api/project-bank/${projectId}/unsolicited-proposal/bidders`),
      ]);
      if (propRes.ok) setProposal(await propRes.json());
      if (bidRes.ok) setBidders(await bidRes.json());
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [projectId]);

  const advanceStatus = async () => {
    if (!proposal) return;
    const currentIdx = PROPOSAL_STEPS.indexOf(proposal.status as ProposalStatus);
    if (currentIdx === -1 || currentIdx >= PROPOSAL_STEPS.length - 1) return;

    const nextStatus = PROPOSAL_STEPS[currentIdx + 1];
    setActionLoading(true);
    try {
      const updateData: Record<string, any> = { status: nextStatus };
      if (nextStatus === 'rfp_published') updateData.rfp_published_date = new Date().toISOString().split('T')[0];
      await apiFetch(`/api/project-bank/${projectId}/unsolicited-proposal`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      fetchData();
    } catch {} finally { setActionLoading(false); }
  };

  const addBidder = async () => {
    setActionLoading(true);
    try {
      await apiFetch(`/api/project-bank/${projectId}/unsolicited-proposal/bidders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...bidderForm,
          bid_amount: bidderForm.bid_amount ? Number(bidderForm.bid_amount) : null,
        }),
      });
      setShowAddBidder(false);
      setBidderForm({ company_name: '', contact_name: '', contact_email: '', bid_amount: '' });
      fetchData();
    } catch {} finally { setActionLoading(false); }
  };

  const scoreBidder = async () => {
    if (!showScoreBidder) return;
    setActionLoading(true);
    try {
      await apiFetch(`/api/project-bank/${projectId}/unsolicited-proposal/bidders/${showScoreBidder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluation_score: scoreForm.evaluation_score ? Number(scoreForm.evaluation_score) : null,
          evaluation_notes: scoreForm.evaluation_notes || null,
        }),
      });
      setShowScoreBidder(null);
      fetchData();
    } catch {} finally { setActionLoading(false); }
  };

  const updateBidderStatus = async (bidderId: string, status: string) => {
    try {
      await apiFetch(`/api/project-bank/${projectId}/unsolicited-proposal/bidders/${bidderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      fetchData();
    } catch {}
  };

  if (loading) {
    return <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded" />)}</div>;
  }

  if (!proposal) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm">No unsolicited proposal data found for this project.</p>
      </div>
    );
  }

  const currentStepIdx = PROPOSAL_STEPS.indexOf(proposal.status as ProposalStatus);
  const canAdvance = currentStepIdx >= 0 && currentStepIdx < PROPOSAL_STEPS.length - 1 && proposal.status !== 'rejected';

  return (
    <div className="space-y-6">
      {/* Timeline Stepper */}
      <Card>
        <CardHeader><CardTitle className="text-base">Proposal Timeline</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-1">
            {PROPOSAL_STEPS.map((step, idx) => {
              const isComplete = idx < currentStepIdx;
              const isCurrent = idx === currentStepIdx;
              return (
                <div key={step} className="flex items-center flex-1">
                  <div className={cn(
                    "flex items-center justify-center rounded-full w-7 h-7 text-xs font-medium border-2 shrink-0",
                    isComplete ? "bg-green-500 border-green-500 text-white" :
                    isCurrent ? "bg-purple-500 border-purple-500 text-white" :
                    "bg-muted border-muted-foreground/20 text-muted-foreground"
                  )}>
                    {isComplete ? <CheckCircle className="h-4 w-4" /> : idx + 1}
                  </div>
                  <div className="ml-1.5 min-w-0">
                    <div className={cn("text-[11px] font-medium truncate", isCurrent ? "text-purple-600" : isComplete ? "text-green-600" : "text-muted-foreground")}>
                      {PROPOSAL_STATUS_LABELS[step]}
                    </div>
                  </div>
                  {idx < PROPOSAL_STEPS.length - 1 && (
                    <div className={cn("flex-1 h-0.5 mx-2", idx < currentStepIdx ? "bg-green-300" : "bg-muted")} />
                  )}
                </div>
              );
            })}
          </div>
          {canAdvance && (
            <Button
              onClick={advanceStatus}
              disabled={actionLoading}
              size="sm"
              className="mt-4 gap-1.5"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              Advance to {PROPOSAL_STATUS_LABELS[PROPOSAL_STEPS[currentStepIdx + 1]]}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Proposal Details */}
      <Card>
        <CardHeader><CardTitle className="text-base">Proponent Details</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Proponent</div>
              <div className="text-sm font-medium">{proposal.proponent_name}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Company</div>
              <div className="text-sm font-medium">{proposal.proponent_company || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Contact</div>
              <div className="text-sm font-medium">{proposal.proponent_contact || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Proposal Date</div>
              <div className="text-sm font-medium">{proposal.proposal_date || '—'}</div>
            </div>
          </div>
          {proposal.rfp_published_date && (
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">RFP Published</div>
                <div className="text-sm font-medium">{proposal.rfp_published_date}</div>
              </div>
              {proposal.counter_proposal_deadline && (
                <div>
                  <div className="text-xs text-muted-foreground">Counter Deadline</div>
                  <div className="text-sm font-medium">{proposal.counter_proposal_deadline}</div>
                </div>
              )}
              {proposal.awarded_to && (
                <div>
                  <div className="text-xs text-muted-foreground">Awarded To</div>
                  <div className="text-sm font-medium">{proposal.awarded_to}</div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bidders Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Counter Bidders</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowAddBidder(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add Bidder
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {bidders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No bidders yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Company</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Contact</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Bid</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Score</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {bidders.map(b => (
                    <tr key={b.id}>
                      <td className="py-2 px-2 font-medium">{b.company_name}</td>
                      <td className="py-2 px-2 text-muted-foreground">{b.contact_name || '—'}</td>
                      <td className="py-2 px-2 text-right font-mono">{b.bid_amount ? formatCurrency(b.bid_amount, b.currency) : '—'}</td>
                      <td className="py-2 px-2 text-right font-mono">{b.evaluation_score != null ? b.evaluation_score.toFixed(1) : '—'}</td>
                      <td className="py-2 px-2">
                        <Badge variant={STATUS_BADGE_VARIANT[b.status] as any || 'outline'}>
                          {b.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => {
                            setScoreForm({ evaluation_score: String(b.evaluation_score ?? ''), evaluation_notes: b.evaluation_notes || '' });
                            setShowScoreBidder(b);
                          }}>
                            <Star className="h-3.5 w-3.5" />
                          </Button>
                          {b.status === 'submitted' && (
                            <Button variant="ghost" size="sm" onClick={() => updateBidderStatus(b.id, 'shortlisted')}>
                              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                            </Button>
                          )}
                          {b.status !== 'winner' && b.status !== 'rejected' && (
                            <Button variant="ghost" size="sm" onClick={() => updateBidderStatus(b.id, 'rejected')} className="text-red-500">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Bidder Dialog */}
      <Dialog open={showAddBidder} onOpenChange={setShowAddBidder}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Counter Bidder</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Company Name</Label>
              <Input value={bidderForm.company_name} onChange={e => setBidderForm(f => ({ ...f, company_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Contact Name</Label>
                <Input value={bidderForm.contact_name} onChange={e => setBidderForm(f => ({ ...f, contact_name: e.target.value }))} />
              </div>
              <div>
                <Label>Contact Email</Label>
                <Input type="email" value={bidderForm.contact_email} onChange={e => setBidderForm(f => ({ ...f, contact_email: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Bid Amount (USD)</Label>
              <Input type="number" value={bidderForm.bid_amount} onChange={e => setBidderForm(f => ({ ...f, bid_amount: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddBidder(false)}>Cancel</Button>
            <Button onClick={addBidder} disabled={actionLoading || !bidderForm.company_name}>
              {actionLoading ? 'Adding...' : 'Add Bidder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Score Bidder Dialog */}
      <Dialog open={!!showScoreBidder} onOpenChange={() => setShowScoreBidder(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Score: {showScoreBidder?.company_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Evaluation Score (0-100)</Label>
              <Input type="number" min={0} max={100} step={0.1} value={scoreForm.evaluation_score} onChange={e => setScoreForm(f => ({ ...f, evaluation_score: e.target.value }))} />
            </div>
            <div>
              <Label>Evaluation Notes</Label>
              <Textarea value={scoreForm.evaluation_notes} onChange={e => setScoreForm(f => ({ ...f, evaluation_notes: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScoreBidder(null)}>Cancel</Button>
            <Button onClick={scoreBidder} disabled={actionLoading}>
              {actionLoading ? 'Saving...' : 'Save Score'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
