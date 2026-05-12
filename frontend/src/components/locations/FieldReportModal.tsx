'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { SelectIATI, type SelectIATIGroup } from '@/components/ui/SelectIATI';
import { DatePicker } from '@/components/ui/date-picker';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  Save,
  X,
  Upload,
  FileText,
  Trash2,
  ExternalLink,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api-fetch';
import { isImageMime } from '@/lib/iatiDocumentLink';
import {
  fieldReportFormSchema,
  type FieldReportFormSchema,
  type FieldReport,
  type FieldReportAttachment,
  type FieldReportEventType,
  FIELD_REPORT_EVENT_TYPES,
  FIELD_REPORT_EVENT_TYPE_LABELS,
  getDefaultFieldReportValues,
} from '@/lib/schemas/field-report';
import { RequiredDot } from '@/components/ui/required-dot';
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Numbered IATI-style codes for the event-type dropdown (UI-only; DB still stores the enum string)
const EVENT_TYPE_CODE_TO_ENUM: Record<string, FieldReportEventType> = {
  '1': 'workshop',
  '2': 'field_visit',
  '3': 'monitoring_evaluation',
  '4': 'training',
  '5': 'community_consultation',
  '6': 'inception',
  '7': 'handover',
  '8': 'other',
};

const EVENT_TYPE_ENUM_TO_CODE: Record<FieldReportEventType, string> = Object.fromEntries(
  Object.entries(EVENT_TYPE_CODE_TO_ENUM).map(([code, type]) => [type, code]),
) as Record<FieldReportEventType, string>;

const FIELD_REPORT_EVENT_TYPE_DESCRIPTIONS: Record<FieldReportEventType, string> = {
  workshop: 'Structured group session for capacity building, planning, or knowledge exchange.',
  field_visit: 'Staff or partner visit to the location to observe or carry out activities.',
  monitoring_evaluation: 'Formal monitoring or evaluation mission to assess progress.',
  training: 'Capacity-building session focused on skills transfer.',
  community_consultation: 'Engagement event with local communities or beneficiaries.',
  inception: 'Project kickoff, launch, or inception meeting.',
  handover: 'Handover, closing, or project completion event.',
  other: 'Any other event not covered by the categories above.',
};

const FIELD_REPORT_EVENT_TYPE_GROUPS: SelectIATIGroup[] = [
  {
    label: 'Event types',
    options: FIELD_REPORT_EVENT_TYPES.map((type) => ({
      code: EVENT_TYPE_ENUM_TO_CODE[type],
      name: FIELD_REPORT_EVENT_TYPE_LABELS[type],
      description: FIELD_REPORT_EVENT_TYPE_DESCRIPTIONS[type],
    })),
  },
];

interface FieldReportModalProps {
  activityId: string;
  locationId: string;
  report: FieldReport | null;
  onClose: () => void;
  onSaved: () => void;
}

const toFormValues = (report: FieldReport | null): FieldReportFormSchema => {
  if (!report) return getDefaultFieldReportValues();
  return {
    event_type: report.event_type,
    event_type_other: report.event_type_other ?? null,
    title: report.title,
    event_date: report.event_date ?? null,
    event_end_date: report.event_end_date ?? null,
    narrative: report.narrative ?? null,
    participants_count: null,
    lead_organisation_id: null,
  };
};

export const FieldReportModal: React.FC<FieldReportModalProps> = ({
  activityId,
  locationId,
  report,
  onClose,
  onSaved,
}) => {
  const [savingDetails, setSavingDetails] = useState(false);
  const [reportId, setReportId] = useState<string | null>(report?.id ?? null);
  const [attachments, setAttachments] = useState<FieldReportAttachment[]>(
    report?.attachments ?? [],
  );
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<FieldReportFormSchema>({
    resolver: zodResolver(fieldReportFormSchema),
    defaultValues: toFormValues(report),
  });

  const eventType = watch('event_type');

  // Reload attachments if we already have a reportId (e.g. when editing)
  const refetchAttachments = useCallback(async (id: string) => {
    try {
      const res = await apiFetch(
        `/api/activities/${activityId}/locations/${locationId}/field-reports/${id}/attachments`,
      );
      if (!res.ok) return;
      const data = await res.json();
      setAttachments(data.attachments ?? []);
    } catch (err) {
      console.error('[FieldReportModal] refetch attachments error:', err);
    }
  }, [activityId, locationId]);

  const onSubmit = async (values: FieldReportFormSchema) => {
    setSavingDetails(true);
    try {
      const isUpdate = !!reportId;
      const url = isUpdate
        ? `/api/activities/${activityId}/locations/${locationId}/field-reports/${reportId}`
        : `/api/activities/${activityId}/locations/${locationId}/field-reports`;
      const method = isUpdate ? 'PATCH' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save field report');
      }
      const data = await res.json();
      const saved = data.fieldReport;
      if (!isUpdate && saved?.id) {
        setReportId(saved.id);
        toast.success('Field report created — you can now add photos and documents');
      } else {
        toast.success('Field report updated');
      }
    } catch (err: any) {
      console.error('[FieldReportModal] save error:', err);
      toast.error(err.message || 'Failed to save field report');
    } finally {
      setSavingDetails(false);
    }
  };

  const uploadAndAttach = async (file: File): Promise<void> => {
    if (!reportId) {
      toast.error('Save the field report first');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`"${file.name}" exceeds the 10MB limit`);
      return;
    }

    const mediaType: 'photo' | 'document' = isImageMime(file.type) ? 'photo' : 'document';

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('activityId', activityId);

      const uploadRes = await apiFetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        throw new Error(err.error || 'Upload failed');
      }
      const uploadData = await uploadRes.json();

      const attachRes = await apiFetch(
        `/api/activities/${activityId}/locations/${locationId}/field-reports/${reportId}/attachments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            media_type: mediaType,
            url: uploadData.url,
            file_name: uploadData.filename,
            file_size: uploadData.size,
            mime_type: uploadData.mimeType,
            file_path: uploadData.path,
            thumbnail_url: uploadData.thumbnailUrl,
            title: mediaType === 'document' ? uploadData.filename : null,
          }),
        },
      );
      if (!attachRes.ok) {
        const err = await attachRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to attach file');
      }
      const attachData = await attachRes.json();
      setAttachments((prev) => [...prev, attachData.attachment]);
    } catch (err: any) {
      console.error('[FieldReportModal] upload error:', err);
      toast.error(err.message || `Failed to upload ${file.name}`);
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!reportId) {
      toast.error('Save the field report first');
      return;
    }
    const list = Array.from(files);
    setUploading(true);
    try {
      for (const file of list) {
        // eslint-disable-next-line no-await-in-loop
        await uploadAndAttach(file);
      }
      toast.success(list.length === 1 ? 'File added' : `${list.length} files added`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!reportId) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!reportId) return;
    handleFiles(e.dataTransfer.files);
  };

  const updateAttachment = async (
    attachment: FieldReportAttachment,
    patch: Partial<Pick<FieldReportAttachment, 'caption' | 'title' | 'description'>>,
  ) => {
    if (!reportId || !attachment.id) return;
    // optimistic
    setAttachments((prev) =>
      prev.map((a) => (a.id === attachment.id ? { ...a, ...patch } : a)),
    );
    try {
      const res = await apiFetch(
        `/api/activities/${activityId}/locations/${locationId}/field-reports/${reportId}/attachments/${attachment.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        },
      );
      if (!res.ok) throw new Error('Failed to update attachment');
    } catch (err: any) {
      console.error('[FieldReportModal] attachment update error:', err);
      toast.error(err.message || 'Failed to update attachment');
      if (reportId) refetchAttachments(reportId);
    }
  };

  const removeAttachment = async (attachment: FieldReportAttachment) => {
    if (!reportId || !attachment.id) return;
    setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
    try {
      const res = await apiFetch(
        `/api/activities/${activityId}/locations/${locationId}/field-reports/${reportId}/attachments/${attachment.id}`,
        { method: 'DELETE' },
      );
      if (!res.ok) throw new Error('Failed to remove attachment');
      toast.success('Removed');
    } catch (err: any) {
      console.error('[FieldReportModal] remove attachment error:', err);
      toast.error(err.message || 'Failed to remove attachment');
      if (reportId) refetchAttachments(reportId);
    }
  };

  const handleDoneClick = () => {
    onSaved();
  };

  const attachmentsLocked = !reportId;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[92vh] w-[min(92vw,900px)] max-w-[900px] flex-col overflow-hidden p-0">
        <DialogHeader className="bg-surface-muted border-b px-6 py-4 mx-0 mt-0 rounded-t-lg">
          <DialogTitle>{report ? 'Edit field report' : 'New field report'}</DialogTitle>
          <DialogDescription>
            Record a workshop, visit, or other event that took place at this location. Add photos and
            documents to capture what happened.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-4">
            {/* Details */}
            <section className="space-y-4">
              <h3 className="text-body font-medium">Details</h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Event type
                    <RequiredDot />
                    <HelpTextTooltip content="The kind of event that took place at this location — for example a workshop, field visit, training, or community consultation." />
                  </Label>
                  <Controller
                    control={control}
                    name="event_type"
                    render={({ field }) => (
                      <SelectIATI
                        groups={FIELD_REPORT_EVENT_TYPE_GROUPS}
                        value={EVENT_TYPE_ENUM_TO_CODE[field.value]}
                        onValueChange={(code) => {
                          const next = EVENT_TYPE_CODE_TO_ENUM[code];
                          if (next) field.onChange(next);
                        }}
                        placeholder="Choose event type"
                        dropdownId="field-report-event-type"
                      />
                    )}
                  />
                </div>

                {eventType === 'other' && (
                  <div className="space-y-2">
                    <Label htmlFor="event_type_other" className="flex items-center gap-2">
                      Describe event type
                      <RequiredDot />
                      <HelpTextTooltip content="A short label for the event type when it doesn't fit any of the predefined categories." />
                    </Label>
                    <Input
                      id="event_type_other"
                      {...register('event_type_other')}
                      placeholder="e.g. Donor visit"
                    />
                    {errors.event_type_other?.message && (
                      <p className="text-helper text-destructive">
                        {errors.event_type_other.message as string}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title" className="flex items-center gap-2">
                  Title
                  <RequiredDot />
                  <HelpTextTooltip content="A short, recognisable name for the event — used in lists and summaries." />
                </Label>
                <Input
                  id="title"
                  {...register('title')}
                  placeholder="e.g. Inception workshop in Yangon"
                />
                {errors.title?.message && (
                  <p className="text-helper text-destructive">{errors.title.message as string}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="event_date" className="flex items-center gap-2">
                    Start date
                    <HelpTextTooltip content="The day the event took place. For multi-day events, this is the first day." />
                  </Label>
                  <Controller
                    control={control}
                    name="event_date"
                    render={({ field }) => (
                      <DatePicker
                        id="event_date"
                        value={field.value ?? ''}
                        onChange={(value) => field.onChange(value || null)}
                        placeholder="Select start date"
                        dropdownId="field-report-event-date"
                      />
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event_end_date" className="flex items-center gap-2">
                    End date
                    <HelpTextTooltip content="Optional. The last day of the event if it spanned multiple days." />
                  </Label>
                  <Controller
                    control={control}
                    name="event_end_date"
                    render={({ field }) => (
                      <DatePicker
                        id="event_end_date"
                        value={field.value ?? ''}
                        onChange={(value) => field.onChange(value || null)}
                        placeholder="Select end date"
                        dropdownId="field-report-event-end-date"
                      />
                    )}
                  />
                  {errors.event_end_date?.message && (
                    <p className="text-helper text-destructive">
                      {errors.event_end_date.message as string}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="narrative" className="flex items-center gap-2">
                  Description
                  <HelpTextTooltip content="A narrative of what happened at this event — who was involved, what was discussed or done, and the main outcomes." />
                </Label>
                <Textarea
                  id="narrative"
                  rows={5}
                  {...register('narrative')}
                  placeholder="Brief description of the event, who was involved, outcomes…"
                />
              </div>

              <div className="flex items-center justify-end">
                <Button type="submit" disabled={savingDetails} className="flex items-center gap-2">
                  {savingDetails ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {reportId ? 'Update details' : 'Save details'}
                </Button>
              </div>
            </section>

            {/* Photos & Documents */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-body font-medium">Photos &amp; Documents</h3>
                <HelpTextTooltip content="Attach photos and supporting documents from this event — for example photos from the day, trip reports, attendance sheets, or agendas. Images are auto-classified as photos; everything else is treated as a document." />
              </div>

              {attachmentsLocked ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Save the details above first to enable file uploads.
                  </AlertDescription>
                </Alert>
              ) : (
                <div
                  className={cn(
                    'flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed bg-muted p-8 text-center transition-all',
                    isDragOver
                      ? 'scale-[1.01] border-primary bg-primary/10'
                      : 'border-input hover:border-slate-400',
                    uploading && 'pointer-events-none opacity-70',
                  )}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                  {uploading ? (
                    <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                  ) : (
                    <Upload
                      className={cn(
                        'h-10 w-10',
                        isDragOver ? 'text-primary' : 'text-muted-foreground',
                      )}
                    />
                  )}
                  <div>
                    <p className="text-body font-medium text-foreground">
                      {uploading
                        ? 'Uploading…'
                        : isDragOver
                          ? 'Drop your files here'
                          : 'Drag &amp; drop files here, or click to browse'}
                    </p>
                    <p className="mt-1 text-helper text-muted-foreground">
                      Photos (JPG, PNG, GIF…) and documents (PDF, DOCX, XLSX…) — up to 10MB each
                    </p>
                  </div>
                </div>
              )}

              {!attachmentsLocked && attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((a) => {
                    const isPhoto = a.media_type === 'photo';
                    return (
                      <Card key={a.id} className="p-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                            {isPhoto ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={a.thumbnail_url || a.url}
                                alt={a.caption || a.file_name || 'photo'}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <FileText className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <a
                              href={a.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 truncate text-body font-medium text-primary hover:underline"
                            >
                              {a.title || a.file_name || (isPhoto ? 'Photo' : 'Document')}
                              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                            </a>
                            <Input
                              placeholder={isPhoto ? 'Caption (optional)' : 'Title'}
                              defaultValue={(isPhoto ? a.caption : a.title) ?? a.file_name ?? ''}
                              onBlur={(e) => {
                                const next = e.target.value || null;
                                const key = isPhoto ? 'caption' : 'title';
                                if (((isPhoto ? a.caption : a.title) ?? null) !== next) {
                                  updateAttachment(a, { [key]: next } as any);
                                }
                              }}
                              className="h-8 text-helper"
                            />
                            {!isPhoto && (
                              <Textarea
                                placeholder="Description (optional)"
                                defaultValue={a.description ?? ''}
                                rows={2}
                                onBlur={(e) => {
                                  const next = e.target.value || null;
                                  if ((a.description ?? null) !== next) {
                                    updateAttachment(a, { description: next });
                                  }
                                }}
                                className="text-helper"
                              />
                            )}
                          </div>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => removeAttachment(a)}
                            title="Remove file"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <DialogFooter className="flex-shrink-0 border-t bg-background px-6 py-4 sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button type="button" onClick={handleDoneClick} disabled={!reportId}>
              Done
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FieldReportModal;
