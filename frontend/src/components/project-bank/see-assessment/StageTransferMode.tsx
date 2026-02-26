"use client"

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Users } from 'lucide-react';
import { SEEDocumentUploadZone } from './SEEDocumentUploadZone';
import { apiFetch } from '@/lib/api-fetch';
import { SEE_TRANSFER_MODE_LABELS } from '@/lib/project-bank-utils';
import type { UseSEEAssessmentWizardReturn } from '@/hooks/use-see-assessment-wizard';
import type { ProposalBidder } from '@/types/project-bank';

const COMPETITIVE_MODES = ['competitive_bid', 'auction', 'swiss_challenge', 'public_offering'];

interface StageTransferModeProps {
  wizard: UseSEEAssessmentWizardReturn;
}

export function StageTransferMode({ wizard }: StageTransferModeProps) {
  const { formData, updateField, transferId, documents, refreshDocuments } = wizard;

  const [bidders, setBidders] = useState<ProposalBidder[]>([]);
  const [showAddBidder, setShowAddBidder] = useState(false);
  const [newBidder, setNewBidder] = useState({ company_name: '', contact_name: '', bid_amount: '' });

  const isCompetitive = COMPETITIVE_MODES.includes(formData.transfer_mode);

  useEffect(() => {
    if (isCompetitive) {
      loadBidders();
    }
  }, [isCompetitive, transferId]);

  async function loadBidders() {
    try {
      const res = await apiFetch(`/api/see-transfers/${transferId}/bidders`);
      if (res.ok) {
        setBidders(await res.json());
      }
    } catch {}
  }

  async function handleAddBidder() {
    if (!newBidder.company_name.trim()) return;

    try {
      const res = await apiFetch(`/api/see-transfers/${transferId}/bidders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: newBidder.company_name,
          contact_name: newBidder.contact_name || null,
          bid_amount: newBidder.bid_amount ? Number(newBidder.bid_amount) : null,
        }),
      });

      if (res.ok) {
        setShowAddBidder(false);
        setNewBidder({ company_name: '', contact_name: '', bid_amount: '' });
        loadBidders();
      }
    } catch {}
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Transfer Mode</h3>
        <p className="text-sm text-muted-foreground">Select the transfer mechanism and manage bidders for competitive processes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="transfer_mode">Transfer Mode</Label>
          <Select
            value={formData.transfer_mode || ''}
            onValueChange={v => updateField('transfer_mode', v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select transfer mode" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SEE_TRANSFER_MODE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="shares_allotted_to_state">Shares Allotted to State (%)</Label>
          <Input
            id="shares_allotted_to_state"
            type="number"
            min={0}
            max={100}
            value={formData.shares_allotted_to_state ?? ''}
            onChange={e => updateField('shares_allotted_to_state', e.target.value ? Number(e.target.value) : null)}
            placeholder="e.g. 30"
          />
        </div>
      </div>

      {/* Tender Document Upload */}
      <div className="border-t pt-4">
        <Label className="mb-2 block">Tender Document</Label>
        <SEEDocumentUploadZone
          transferId={transferId}
          stage="transfer_mode"
          documentType="tender_document"
          documents={documents}
          onDocumentsChange={refreshDocuments}
        />
      </div>

      {/* Bidder Management (only for competitive modes) */}
      {isCompetitive && (
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold">Bidders</h4>
              <Badge variant="gray" className="text-[10px]">{bidders.length}</Badge>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowAddBidder(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Bidder
            </Button>
          </div>

          {bidders.length > 0 ? (
            <div className="overflow-x-auto border rounded-md">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-surface-muted">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Company</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Contact</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Bid Amount</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {bidders.map(bidder => (
                    <tr key={bidder.id}>
                      <td className="px-3 py-2 font-medium">{bidder.company_name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{bidder.contact_name || '—'}</td>
                      <td className="px-3 py-2 text-right font-mono">
                        {bidder.bid_amount ? `$${bidder.bid_amount.toLocaleString()}` : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="gray" className="text-[10px]">{bidder.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4 border rounded-md">
              No bidders added yet
            </p>
          )}

          {/* Add Bidder Dialog */}
          <Dialog open={showAddBidder} onOpenChange={setShowAddBidder}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Bidder</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Company Name *</Label>
                  <Input
                    value={newBidder.company_name}
                    onChange={e => setNewBidder(prev => ({ ...prev, company_name: e.target.value }))}
                    placeholder="e.g. Myanmar Investment Group"
                  />
                </div>
                <div>
                  <Label>Contact Name</Label>
                  <Input
                    value={newBidder.contact_name}
                    onChange={e => setNewBidder(prev => ({ ...prev, contact_name: e.target.value }))}
                    placeholder="e.g. U Kyaw Thet"
                  />
                </div>
                <div>
                  <Label>Bid Amount (USD)</Label>
                  <Input
                    type="number"
                    value={newBidder.bid_amount}
                    onChange={e => setNewBidder(prev => ({ ...prev, bid_amount: e.target.value }))}
                    placeholder="e.g. 50000000"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddBidder(false)}>Cancel</Button>
                <Button onClick={handleAddBidder}>Add Bidder</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
