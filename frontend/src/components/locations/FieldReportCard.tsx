'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pencil, Trash2, Calendar, ImageIcon, FileText, Users } from 'lucide-react';
import {
  FIELD_REPORT_EVENT_TYPE_LABELS,
  type FieldReport,
} from '@/lib/schemas/field-report';

interface FieldReportCardProps {
  report: FieldReport;
  onEdit: () => void;
  onDelete: () => void;
  canEdit: boolean;
}

const formatDateRange = (start?: string | null, end?: string | null): string | null => {
  if (!start && !end) return null;
  if (start && end && start !== end) return `${start} → ${end}`;
  return start || end || null;
};

export const FieldReportCard: React.FC<FieldReportCardProps> = ({
  report,
  onEdit,
  onDelete,
  canEdit,
}) => {
  const typeLabel =
    report.event_type === 'other' && report.event_type_other
      ? report.event_type_other
      : FIELD_REPORT_EVENT_TYPE_LABELS[report.event_type];

  const dateRange = formatDateRange(report.event_date, report.event_end_date);
  const photoCount = report.photo_count ?? 0;
  const documentCount = report.document_count ?? 0;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="font-normal">
              {typeLabel}
            </Badge>
            {dateRange && (
              <span className="inline-flex items-center gap-1 text-helper text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {dateRange}
              </span>
            )}
          </div>
          <div className="text-body font-medium leading-tight">{report.title}</div>
          {report.narrative && (
            <p className="line-clamp-2 text-helper text-muted-foreground">{report.narrative}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 pt-1 text-helper text-muted-foreground">
            {photoCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <ImageIcon className="h-3.5 w-3.5" />
                {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
              </span>
            )}
            {documentCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                {documentCount} {documentCount === 1 ? 'document' : 'documents'}
              </span>
            )}
            {typeof report.participants_count === 'number' && report.participants_count > 0 && (
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {report.participants_count}
              </span>
            )}
          </div>
        </div>
        {canEdit && (
          <div className="flex shrink-0 gap-1">
            <Button type="button" size="icon" variant="ghost" onClick={onEdit} title="Edit field report">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={onDelete}
              title="Delete field report"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default FieldReportCard;
