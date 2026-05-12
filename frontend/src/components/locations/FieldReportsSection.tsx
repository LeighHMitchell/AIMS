'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Loader2, ClipboardList, ArrowRight, Save } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-fetch';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import type { FieldReport } from '@/lib/schemas/field-report';
import { FieldReportCard } from './FieldReportCard';
import { FieldReportModal } from './FieldReportModal';

interface FieldReportsSectionProps {
  activityId: string;
  locationId?: string;
  isNewLocation: boolean;
  canEdit?: boolean;
  /** Triggered when the user wants to save the unsaved parent location now
   *  so they can stay in the modal and start adding a field report. */
  onSaveAndContinue?: () => void;
  /** True while the parent location is being saved. */
  isSaving?: boolean;
}

export const FieldReportsSection: React.FC<FieldReportsSectionProps> = ({
  activityId,
  locationId,
  isNewLocation,
  canEdit = true,
  onSaveAndContinue,
  isSaving = false,
}) => {
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [reports, setReports] = useState<FieldReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<FieldReport | null>(null);

  const fetchReports = useCallback(async () => {
    if (!locationId || isNewLocation) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/api/activities/${activityId}/locations/${locationId}/field-reports`);
      if (!res.ok) throw new Error('Failed to load field reports');
      const data = await res.json();
      setReports(data.fieldReports ?? []);
    } catch (err: any) {
      console.error('[FieldReportsSection] fetch error:', err);
      toast.error(err.message || 'Failed to load field reports');
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [activityId, locationId, isNewLocation]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleAdd = () => {
    setEditingReport(null);
    setModalOpen(true);
  };

  const handleEdit = (report: FieldReport) => {
    setEditingReport(report);
    setModalOpen(true);
  };

  const handleDelete = async (report: FieldReport) => {
    if (!locationId) return;
    const ok = await confirm({
      title: 'Delete field report?',
      description: `"${report.title}" and all its photos and documents will be removed. This cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Keep',
    });
    if (!ok) return;

    try {
      const res = await apiFetch(
        `/api/activities/${activityId}/locations/${locationId}/field-reports/${report.id}`,
        { method: 'DELETE' },
      );
      if (!res.ok) throw new Error('Failed to delete field report');
      toast.success('Field report deleted');
      setReports((prev) => prev.filter((r) => r.id !== report.id));
    } catch (err: any) {
      console.error('[FieldReportsSection] delete error:', err);
      toast.error(err.message || 'Failed to delete field report');
    }
  };

  const handleSaved = () => {
    setModalOpen(false);
    setEditingReport(null);
    fetchReports();
  };

  if (isNewLocation || !locationId) {
    return (
      <div className="space-y-4 mt-4">
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <ClipboardList className="h-8 w-8 text-muted-foreground" />
          <div className="text-body font-medium">Save the location first to add field reports</div>
          <p className="max-w-md text-helper text-muted-foreground">
            Field reports — workshops, visits, M&amp;E missions — attach to a specific location. Save the
            details you've entered so far, and we'll bring you straight back here to log the event.
          </p>
          {canEdit && onSaveAndContinue && (
            <Button
              type="button"
              onClick={onSaveAndContinue}
              disabled={isSaving}
              className="mt-2 flex items-center gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save location &amp; start a field report
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          <p className="text-helper text-muted-foreground">
            Missing a required field? You'll be sent back to the General tab to fix it.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-body font-medium">Field Reports</h3>
          <p className="text-helper text-muted-foreground">
            Record events that took place at this location — workshops, field visits, training, M&amp;E,
            consultations. Attach photos and documents.
          </p>
        </div>
        {canEdit && (
          <Button type="button" onClick={handleAdd} className="flex shrink-0 items-center gap-2">
            <Plus className="h-4 w-4" />
            Add field report
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading field reports…
        </div>
      ) : reports.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <ClipboardList className="h-8 w-8 text-muted-foreground" />
          <div className="text-body font-medium">No field reports yet</div>
          <p className="max-w-md text-helper text-muted-foreground">
            Capture what happened at this location — agendas, photos from the day, trip reports, attendance
            sheets.
          </p>
          {canEdit && (
            <Button type="button" variant="outline" onClick={handleAdd} className="mt-2">
              <Plus className="mr-2 h-4 w-4" />
              Add the first field report
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <FieldReportCard
              key={report.id}
              report={report}
              onEdit={() => handleEdit(report)}
              onDelete={() => handleDelete(report)}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}

      {modalOpen && (
        <FieldReportModal
          activityId={activityId}
          locationId={locationId}
          report={editingReport}
          onClose={() => {
            setModalOpen(false);
            setEditingReport(null);
          }}
          onSaved={handleSaved}
        />
      )}

      <ConfirmDialog />
    </div>
  );
};

export default FieldReportsSection;
