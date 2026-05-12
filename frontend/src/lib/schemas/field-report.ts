import { z } from 'zod';

export const FIELD_REPORT_EVENT_TYPES = [
  'workshop',
  'field_visit',
  'monitoring_evaluation',
  'training',
  'community_consultation',
  'inception',
  'handover',
  'other',
] as const;

export type FieldReportEventType = (typeof FIELD_REPORT_EVENT_TYPES)[number];

export const FIELD_REPORT_EVENT_TYPE_LABELS: Record<FieldReportEventType, string> = {
  workshop: 'Workshop',
  field_visit: 'Field Visit',
  monitoring_evaluation: 'M&E Visit',
  training: 'Training',
  community_consultation: 'Community Consultation',
  inception: 'Inception / Launch',
  handover: 'Handover / Closing',
  other: 'Other',
};

export const FIELD_REPORT_MEDIA_TYPES = ['photo', 'document'] as const;
export type FieldReportMediaType = (typeof FIELD_REPORT_MEDIA_TYPES)[number];

export const fieldReportAttachmentSchema = z.object({
  id: z.string().optional(),
  field_report_id: z.string().optional(),
  media_type: z.enum(FIELD_REPORT_MEDIA_TYPES),
  url: z.string().min(1),
  file_name: z.string().nullable().optional(),
  file_size: z.number().nullable().optional(),
  mime_type: z.string().nullable().optional(),
  file_path: z.string().nullable().optional(),
  thumbnail_url: z.string().nullable().optional(),
  caption: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  sort_order: z.number().int().optional(),
  uploaded_by: z.string().nullable().optional(),
  created_at: z.string().optional(),
});

export type FieldReportAttachment = z.infer<typeof fieldReportAttachmentSchema>;

export const fieldReportFormSchema = z
  .object({
    event_type: z.enum(FIELD_REPORT_EVENT_TYPES),
    event_type_other: z.string().nullable().optional(),
    title: z.string().min(1, 'Title is required'),
    event_date: z.string().nullable().optional(),
    event_end_date: z.string().nullable().optional(),
    narrative: z.string().nullable().optional(),
    participants_count: z
      .union([z.number().int().nonnegative(), z.null()])
      .optional(),
    lead_organisation_id: z.string().nullable().optional(),
  })
  .refine(
    (data) =>
      data.event_type !== 'other' ||
      (typeof data.event_type_other === 'string' && data.event_type_other.trim().length > 0),
    {
      message: 'Please describe the event type',
      path: ['event_type_other'],
    },
  )
  .refine(
    (data) => {
      if (!data.event_date || !data.event_end_date) return true;
      return data.event_end_date >= data.event_date;
    },
    {
      message: 'End date must be on or after the start date',
      path: ['event_end_date'],
    },
  );

export type FieldReportFormSchema = z.infer<typeof fieldReportFormSchema>;

export interface FieldReport extends FieldReportFormSchema {
  id: string;
  location_id: string;
  activity_id: string;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  attachments?: FieldReportAttachment[];
  photo_count?: number;
  document_count?: number;
}

export const getDefaultFieldReportValues = (): FieldReportFormSchema => ({
  event_type: 'field_visit',
  event_type_other: null,
  title: '',
  event_date: null,
  event_end_date: null,
  narrative: null,
  participants_count: null,
  lead_organisation_id: null,
});
