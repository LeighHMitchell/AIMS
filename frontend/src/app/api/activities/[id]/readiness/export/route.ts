/**
 * POST /api/activities/[id]/readiness/export?format=zip|pdf
 *
 * Builds a downloadable package for a single activity covering:
 *   • Readiness Checklist — config, stages/items, statuses, remarks, sign-offs,
 *     evidence documents
 *   • Government Inputs — contributions, budget classification, risk assessment,
 *     evaluation (and evaluation documents)
 *   • Endorsement — validation status, validating authority, dates, notes
 *
 * Two output formats are supported:
 *
 *   format=zip (default)  → one .zip containing the summary PDF and the
 *                           original evidence files in native formats
 *                           (preserves Word/Excel/PDF/image fidelity):
 *     readiness-package_<slug>_<YYYYMMDD>.zip
 *     ├── 00_summary.pdf
 *     ├── stage-XX_<name>/
 *     ├── gov-inputs/
 *     └── endorsement/
 *
 *   format=pdf            → a single merged .pdf. The summary PDF is followed
 *                           by the bytes of every PDF evidence doc (merged with
 *                           pdf-lib) and by any image evidence (embedded as
 *                           full-page images). Word/Excel/other binary formats
 *                           can't be flattened into PDF — they're listed in the
 *                           appendix with a note to use the ZIP variant for the
 *                           originals.
 */

import { NextRequest, NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import { format as formatDate } from 'date-fns';

import { requireAuth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import {
  BUDGET_DIMENSIONS,
  RISK_CATEGORIES,
  riskScoreLabel,
  riskAvgLabel,
  ynuLabel,
} from '@/lib/government-inputs-labels';
import {
  IN_KIND_CATEGORY_LABELS,
  OTHER_CATEGORY_LABELS,
  getContributions,
  contributionAmountLocal,
  contributionAmountUSD,
  type Contribution,
  type InKindCategory,
  type OtherCategory,
} from '@/components/government/contribution-types';
import {
  CHECKLIST_STATUS_OPTIONS,
  FINANCING_MODALITY_OPTIONS,
  FINANCING_TYPE_OPTIONS,
} from '@/types/readiness';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ─── Types (loose — server-side only) ──────────────────────────────────────

type AnyRow = Record<string, any>;

interface UserLite {
  id: string;
  name: string;
}

interface EvidenceDoc {
  id: string;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  storage_path: string | null;
  uploaded_at: string | null;
  uploaded_by_name: string | null;
}

// ─── Utilities ─────────────────────────────────────────────────────────────

function safeFolderName(input: string): string {
  return (input || 'item')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80) || 'item';
}

function safeFileName(input: string): string {
  return (input || 'file').replace(/[\\/:*?"<>|]/g, '_').slice(0, 120) || 'file';
}

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatIso(date: string | null | undefined, fmt = 'd MMMM yyyy'): string {
  if (!date) return '—';
  try {
    return formatDate(new Date(date), fmt);
  } catch {
    return date;
  }
}

function statusLabel(status: string | null | undefined): string {
  if (!status) return 'Not Completed';
  return CHECKLIST_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

// ─── Route handler ─────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  // Auth — respect RLS (same client other activity routes use).
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  const resolvedParams = await Promise.resolve(params);
  const { id: activityId } = resolvedParams;
  if (!activityId) {
    return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
  }

  // Service-role client for storage binary downloads (RLS-friendly bucket reads
  // either need public URLs or the admin key; we already use admin for doc
  // endpoints elsewhere). We've already authorised the caller above.
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });
  }

  try {
    // ── Activity basics ──────────────────────────────────────────────────
    // Use SELECT * to avoid column-name mismatches across environments
    // (matches the `/basic` route's defensive pattern). Any missing optional
    // column just shows up as undefined on the returned row.
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('*')
      .eq('id', activityId)
      .single();

    if (activityError || !activity) {
      console.error('[Readiness Export] Activity lookup failed:', activityError);
      return NextResponse.json(
        { error: 'Activity not found', details: activityError?.message },
        { status: 404 }
      );
    }

    const activityTitle: string = activity.title_narrative || activity.title || 'Untitled Activity';
    const activityAcronym: string = activity.acronym || '';
    const activityIatiId: string = activity.iati_identifier || '';
    const activityPartnerRef: string = activity.other_identifier || activity.partner_id || '';
    const reportingOrgName: string = activity.created_by_org_name || '';
    const reportingOrgAcronym: string = activity.created_by_org_acronym || '';

    // ── Readiness: config + templates + items + responses + documents + signoffs
    const [configRes, templatesRes] = await Promise.all([
      supabase.from('activity_readiness_config').select('*').eq('activity_id', activityId).maybeSingle(),
      supabase.from('readiness_checklist_templates').select('*').eq('is_active', true).order('stage_order', { ascending: true }),
    ]);

    const config = configRes.data as AnyRow | null;
    const templates = (templatesRes.data || []) as AnyRow[];
    const templateIds = templates.map((t) => t.id);

    const { data: items } = templateIds.length
      ? await supabase
          .from('readiness_checklist_items')
          .select('*')
          .in('template_id', templateIds)
          .eq('is_active', true)
          .order('display_order', { ascending: true })
      : { data: [] };

    const { data: responses } = await supabase
      .from('activity_readiness_responses')
      .select('*')
      .eq('activity_id', activityId);

    const responseIds = (responses || []).map((r: AnyRow) => r.id);
    const { data: evidenceDocs } = responseIds.length
      ? await supabase
          .from('readiness_evidence_documents')
          .select('*')
          .in('response_id', responseIds)
      : { data: [] };

    const { data: signoffs } = await supabase
      .from('readiness_stage_signoffs')
      .select('*')
      .eq('activity_id', activityId);

    // ── Gov Inputs + Gov Inputs docs + Endorsement ───────────────────────
    const [govInputsRes, govDocsRes, endorsementRes] = await Promise.all([
      supabase.from('government_inputs').select('*').eq('activity_id', activityId).maybeSingle(),
      supabase
        .from('government_input_documents')
        .select('*')
        .eq('activity_id', activityId)
        .order('created_at', { ascending: false }),
      supabase.from('government_endorsements').select('*').eq('activity_id', activityId).maybeSingle(),
    ]);
    const govInputs = govInputsRes.data as AnyRow | null;
    const govDocs = (govDocsRes.data || []) as AnyRow[];
    const endorsement = endorsementRes.data as AnyRow | null;

    // ── User lookup for display names on responses / uploads / signoffs ──
    const userIds = new Set<string>();
    (responses || []).forEach((r: AnyRow) => {
      if (r.completed_by) userIds.add(r.completed_by);
      if (r.verified_by) userIds.add(r.verified_by);
    });
    (evidenceDocs || []).forEach((d: AnyRow) => {
      if (d.uploaded_by) userIds.add(d.uploaded_by);
    });
    (govDocs || []).forEach((d: AnyRow) => {
      if (d.uploaded_by) userIds.add(d.uploaded_by);
    });
    (signoffs || []).forEach((s: AnyRow) => {
      if (s.signed_off_by) userIds.add(s.signed_off_by);
    });
    if (user?.id) userIds.add(user.id);

    const { data: users } = userIds.size > 0
      ? await supabase.from('users').select('id, first_name, last_name').in('id', Array.from(userIds))
      : { data: [] };
    const userMap = new Map<string, UserLite>(
      (users || []).map((u: AnyRow) => [
        u.id,
        { id: u.id, name: [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || 'Unknown' },
      ])
    );
    const exporter = user?.id ? userMap.get(user.id)?.name || 'Unknown' : 'Unknown';

    // ── Resolve national plans for Evaluation display ────────────────────
    const linkedPlanIds: string[] = Array.isArray(govInputs?.evaluation_results?.linkedNationalPlanIds)
      ? govInputs.evaluation_results.linkedNationalPlanIds
      : [];
    const { data: plans } = linkedPlanIds.length
      ? await supabase
          .from('national_plans')
          .select('id, name, acronym, start_date, end_date')
          .in('id', linkedPlanIds)
      : { data: [] };
    const planDisplay = (id: string): string => {
      const p = (plans || []).find((x: AnyRow) => x.id === id);
      if (!p) return id;
      const sy = p.start_date ? String(p.start_date).slice(0, 4) : '';
      const ey = p.end_date ? String(p.end_date).slice(0, 4) : '';
      const years = sy && ey ? ` ${sy}-${ey}` : sy ? ` ${sy}-` : ey ? ` -${ey}` : '';
      return `${p.name}${p.acronym ? ` (${p.acronym})` : ''}${years}`;
    };

    // ── Resolve format ───────────────────────────────────────────────────
    const formatParam = (request.nextUrl.searchParams.get('format') || 'zip').toLowerCase();
    const outputFormat: 'zip' | 'pdf' = formatParam === 'pdf' ? 'pdf' : 'zip';

    // ── Fetch evidence binaries into memory once; branch on format later ──
    const missingFiles: Array<{ name: string; reason: string }> = [];

    // Stage folder naming: stage-01_<slug>.
    const stageFolderFor = (templateId: string): string => {
      const t = templates.find((x) => x.id === templateId);
      if (!t) return 'stage-misc';
      const num = String(t.stage_order ?? '00').padStart(2, '0');
      return `stage-${num}_${safeFolderName(t.name || '')}`;
    };

    interface FetchedFile {
      area: string;
      path: string;
      name: string;
      size: number | null;
      mimeType: string;
      uploadedAt: string | null;
      uploadedBy: string | null;
      bytes: ArrayBuffer;
    }
    const fetchedFiles: FetchedFile[] = [];

    const downloadFile = async (
      bucket: string,
      storagePath: string | null,
      meta: Omit<FetchedFile, 'bytes' | 'size' | 'mimeType'> & {
        size: number | null;
        mimeType: string;
      }
    ): Promise<void> => {
      if (!storagePath) {
        missingFiles.push({ name: meta.name, reason: 'No storage path on record' });
        return;
      }
      try {
        const { data: blob, error } = await admin!.storage.from(bucket).download(storagePath);
        if (error || !blob) {
          missingFiles.push({ name: meta.name, reason: error?.message || 'File not found in storage' });
          return;
        }
        const ab = await blob.arrayBuffer();
        fetchedFiles.push({ ...meta, bytes: ab });
      } catch (err: any) {
        missingFiles.push({ name: meta.name, reason: err?.message || 'Unknown download error' });
      }
    };

    // Map response_id -> (template_id, item_id) for evidence-doc placement
    const responseById = new Map<string, AnyRow>();
    (responses || []).forEach((r: AnyRow) => responseById.set(r.id, r));
    const itemById = new Map<string, AnyRow>();
    (items || []).forEach((i: AnyRow) => itemById.set(i.id, i));

    // Evidence document placements, queued in parallel
    const evidenceJobs: Array<Promise<unknown>> = [];

    (evidenceDocs || []).forEach((d: AnyRow) => {
      const resp = responseById.get(d.response_id);
      const item = resp ? itemById.get(resp.checklist_item_id) : null;
      const tplId = item?.template_id as string | undefined;
      const folder = tplId ? stageFolderFor(tplId) : 'stage-misc';
      const base = safeFileName(d.file_name || 'file');
      const zipPath = `${folder}/${base}`;
      evidenceJobs.push(
        downloadFile('activity-documents', d.storage_path, {
          area: `Readiness — ${templates.find((t) => t.id === tplId)?.name || 'Checklist'}`,
          path: zipPath,
          name: d.file_name || base,
          size: d.file_size ?? null,
          mimeType: d.file_type || 'application/octet-stream',
          uploadedAt: d.uploaded_at ?? null,
          uploadedBy: d.uploaded_by ? userMap.get(d.uploaded_by)?.name || null : null,
        })
      );
    });

    // Government-Inputs documents (evaluation, budget-supporting, etc.)
    (govDocs || []).forEach((d: AnyRow) => {
      const cat = (d.category || 'misc') as string;
      const folder = `gov-inputs/${safeFolderName(cat)}`;
      const base = safeFileName(d.file_name || 'file');
      const zipPath = `${folder}/${base}`;
      evidenceJobs.push(
        downloadFile('government-input-documents', d.file_path, {
          area: `Gov Inputs — ${cat}`,
          path: zipPath,
          name: d.file_name || base,
          size: d.file_size ?? null,
          mimeType: d.mime_type || 'application/octet-stream',
          uploadedAt: d.created_at ?? null,
          uploadedBy: d.uploaded_by ? userMap.get(d.uploaded_by)?.name || null : null,
        })
      );
    });

    await Promise.all(evidenceJobs);

    // Endorsement-attached doc (optional MOU stored as a remote URL) —
    // recorded as a "missing" binary so it shows up in the appendix even if
    // we can't download the bytes ourselves.
    if (endorsement?.document_url) {
      missingFiles.push({
        name: endorsement.document_title || 'Endorsement document',
        reason: 'External link — view at original URL',
      });
    }

    // ─── Build summary PDF ──────────────────────────────────────────────
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 48;

    const heading = (text: string, size = 16) => {
      if (y > 760) {
        doc.addPage();
        y = 48;
      }
      doc.setFontSize(size);
      doc.setFont('helvetica', 'bold');
      doc.text(text, 48, y);
      y += size + 8;
      doc.setFont('helvetica', 'normal');
    };

    const paragraph = (text: string, size = 10) => {
      if (!text) return;
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(text, pageWidth - 96);
      lines.forEach((line: string) => {
        if (y > 790) {
          doc.addPage();
          y = 48;
        }
        doc.text(line, 48, y);
        y += size + 4;
      });
    };

    // Cover
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Readiness Package', 48, y);
    y += 28;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'normal');
    doc.text(activityTitle, 48, y, { maxWidth: pageWidth - 96 });
    y += 22;

    const coverRows: string[][] = [
      ['Activity acronym', activityAcronym || '—'],
      ['IATI identifier', activityIatiId || '—'],
      ['Partner ID', activityPartnerRef || '—'],
      ['Reported by', reportingOrgName
        ? `${reportingOrgName}${reportingOrgAcronym ? ` (${reportingOrgAcronym})` : ''}`
        : '—'],
      ['Financing type', Array.isArray(config?.financing_type) && config!.financing_type.length
        ? (config!.financing_type as string[])
            .map((v: string) => {
              const o = FINANCING_TYPE_OPTIONS.find((x) => x.value === v);
              return o ? `${o.code} ${o.label}` : v;
            })
            .join(', ')
        : '—'],
      ['Financing modality', (() => {
        const o = FINANCING_MODALITY_OPTIONS.find((x) => x.value === config?.financing_modality);
        return o ? `${o.code} ${o.label}` : '—';
      })()],
      ['Infrastructure project', config?.is_infrastructure ? 'Yes' : 'No'],
      ['Validation status', endorsement?.validation_status
        ? String(endorsement.validation_status).replace(/_/g, ' ')
        : '—'],
      ['Validating authority', endorsement?.validating_authority || '—'],
      ['Effective date', formatIso(endorsement?.effective_date)],
      ['Validation date', formatIso(endorsement?.validation_date)],
      ['Exported at', formatDate(new Date(), 'd MMMM yyyy, HH:mm')],
      ['Exported by', exporter],
    ];
    autoTable(doc, {
      startY: y,
      head: [],
      body: coverRows,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: { 0: { cellWidth: 130, fontStyle: 'bold', textColor: 80 } },
    });
    y = ((doc as any).lastAutoTable?.finalY || y) + 24;

    // Section 1 — Readiness Checklist
    heading('Section 1 — Readiness Checklist');
    templates.forEach((t) => {
      const templateItems = (items || []).filter((i: AnyRow) => i.template_id === t.id);
      if (templateItems.length === 0) return;

      if (y > 720) {
        doc.addPage();
        y = 48;
      }
      heading(`Stage ${t.stage_order}: ${t.name}`, 13);
      if (t.description) paragraph(t.description);

      const completed = templateItems.filter((i: AnyRow) => {
        const r = (responses || []).find((x: AnyRow) => x.checklist_item_id === i.id);
        return r?.status === 'completed' || r?.status === 'not_required';
      }).length;
      paragraph(`Progress: ${completed} of ${templateItems.length} items complete / not required.`);

      autoTable(doc, {
        startY: y,
        head: [['Code', 'Item', 'Status', 'Remarks', 'Completed by', 'Evidence']],
        body: templateItems.map((i: AnyRow) => {
          const r = (responses || []).find((x: AnyRow) => x.checklist_item_id === i.id);
          const docsForItem = (evidenceDocs || []).filter((d: AnyRow) =>
            (responses || []).some((x: AnyRow) => x.id === d.response_id && x.checklist_item_id === i.id)
          );
          const completedBy = r?.completed_by
            ? `${userMap.get(r.completed_by)?.name || '—'}${r.completed_at ? `\n${formatIso(r.completed_at)}` : ''}`
            : '—';
          return [
            i.code || '',
            i.title || '',
            statusLabel(r?.status),
            (r?.remarks || '').trim() || '—',
            completedBy,
            docsForItem.length > 0
              ? docsForItem.map((d: AnyRow) => d.file_name).join('\n')
              : '—',
          ];
        }),
        styles: { fontSize: 9, cellPadding: 4, valign: 'top' },
        headStyles: { fillColor: [243, 244, 246], textColor: 40 },
        columnStyles: {
          0: { cellWidth: 50 },
          2: { cellWidth: 80 },
          4: { cellWidth: 90 },
        },
        didDrawPage: () => {
          /* let autoTable handle pagination */
        },
      });
      y = ((doc as any).lastAutoTable?.finalY || y) + 12;

      const so = (signoffs || []).find((s: AnyRow) => s.template_id === t.id);
      if (so) {
        paragraph(
          `Signed off by ${userMap.get(so.signed_off_by)?.name || 'Unknown'} — ${so.signature_title || ''} on ${formatIso(so.signed_off_at)}${so.remarks ? `\nRemarks: ${so.remarks}` : ''}`
        );
      } else {
        paragraph('Sign-off: not yet recorded.');
      }
      y += 8;
    });

    // Section 2 — Government Inputs
    doc.addPage();
    y = 48;
    heading('Section 2 — Government Inputs');

    // 2a — Contributions
    heading('2a. Contributions', 13);
    const contribs: Contribution[] = getContributions(govInputs?.rgc_contribution as any);
    if (contribs.length === 0) {
      paragraph('No contributions recorded.');
    } else {
      autoTable(doc, {
        startY: y,
        head: [['Type', 'Category / detail', 'Description', 'Local amount', 'USD amount']],
        body: contribs.map((c) => {
          let category = '';
          if (c.type === 'financial') category = c.sourceOfFunding || 'Financial';
          if (c.type === 'in_kind') category = IN_KIND_CATEGORY_LABELS[c.category as InKindCategory] || c.category;
          if (c.type === 'other') category = OTHER_CATEGORY_LABELS[c.category as OtherCategory] || c.category;
          const local = contributionAmountLocal(c);
          const usd = contributionAmountUSD(c);
          return [
            c.type === 'in_kind' ? 'In-kind' : c.type === 'other' ? 'Other' : 'Financial',
            category,
            c.description || '—',
            local != null ? `${local.toLocaleString()}${(c as any).currency ? ` ${(c as any).currency}` : ''}` : '—',
            usd != null ? `$${usd.toLocaleString()}` : '—',
          ];
        }),
        styles: { fontSize: 9, cellPadding: 4, valign: 'top' },
        headStyles: { fillColor: [243, 244, 246], textColor: 40 },
      });
      y = ((doc as any).lastAutoTable?.finalY || y) + 16;
    }

    // 2b — Budget Classification
    if (y > 680) {
      doc.addPage();
      y = 48;
    }
    heading('2b. Budget Classification', 13);
    const obc = govInputs?.on_budget_classification || {};
    autoTable(doc, {
      startY: y,
      head: [['Dimension', 'Status', 'Guidance']],
      body: BUDGET_DIMENSIONS.map((d) => [d.label, obc[d.key] || '—', d.help]),
      styles: { fontSize: 9, cellPadding: 4, valign: 'top' },
      headStyles: { fillColor: [243, 244, 246], textColor: 40 },
      columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 80 } },
    });
    y = ((doc as any).lastAutoTable?.finalY || y) + 16;

    // 2c — Risk Assessment
    if (y > 680) {
      doc.addPage();
      y = 48;
    }
    heading('2c. Risk Assessment', 13);
    const ra = (govInputs?.risk_assessment || {}) as Record<string, { score?: number; unsure?: boolean }>;
    const raRows: string[][] = [];
    let answered = 0;
    let scoreSum = 0;
    let scoreCount = 0;
    RISK_CATEGORIES.forEach((cat) => {
      cat.questions.forEach((q) => {
        const a = ra[q.id];
        let level = '—';
        if (a?.unsure) {
          answered++;
          level = 'Unsure';
        } else if (typeof a?.score === 'number') {
          answered++;
          level = riskScoreLabel(a.score);
          scoreSum += a.score;
          scoreCount++;
        }
        raRows.push([cat.label, q.text, level]);
      });
    });
    autoTable(doc, {
      startY: y,
      head: [['Category', 'Question', 'Level']],
      body: raRows,
      styles: { fontSize: 9, cellPadding: 4, valign: 'top' },
      headStyles: { fillColor: [243, 244, 246], textColor: 40 },
      columnStyles: { 0: { cellWidth: 110 }, 2: { cellWidth: 70 } },
    });
    y = ((doc as any).lastAutoTable?.finalY || y) + 12;
    const overall = scoreCount > 0 ? scoreSum / scoreCount : 0;
    paragraph(
      `Questions answered: ${answered} / ${RISK_CATEGORIES.reduce((n, c) => n + c.questions.length, 0)}. ` +
        (scoreCount > 0 ? `Overall risk: ${riskAvgLabel(overall)} (average score ${overall.toFixed(1)}).` : 'Not enough answers to compute an overall risk level.')
    );
    y += 8;

    // 2d — Evaluation
    if (y > 680) {
      doc.addPage();
      y = 48;
    }
    heading('2d. Evaluation', 13);
    const ev = govInputs?.evaluation_results || {};
    autoTable(doc, {
      startY: y,
      head: [['Question', 'Answer']],
      body: [
        ['Has this activity been evaluated by the government?', ynuLabel(ev.hasEvaluation)],
        ['Is this activity linked to a national plan or strategy?', ynuLabel(ev.inNationalFramework)],
        [
          'Linked national plans & strategies',
          linkedPlanIds.length ? linkedPlanIds.map(planDisplay).join('\n') : '—',
        ],
      ],
      styles: { fontSize: 9, cellPadding: 4, valign: 'top' },
      headStyles: { fillColor: [243, 244, 246], textColor: 40 },
      columnStyles: { 0: { cellWidth: 260 } },
    });
    y = ((doc as any).lastAutoTable?.finalY || y) + 20;

    // Section 3 — Endorsement
    if (y > 680) {
      doc.addPage();
      y = 48;
    }
    heading('Section 3 — Endorsement');
    if (!endorsement) {
      paragraph('No endorsement details have been recorded yet.');
    } else {
      autoTable(doc, {
        startY: y,
        head: [],
        body: [
          ['Validation status', String(endorsement.validation_status || '—').replace(/_/g, ' ')],
          ['Validating authority', endorsement.validating_authority || '—'],
          ['Effective date', formatIso(endorsement.effective_date)],
          ['Validation date', formatIso(endorsement.validation_date)],
          ['Validation notes', endorsement.validation_notes || '—'],
          ['Attached document', endorsement.document_title || '—'],
        ],
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 4, valign: 'top' },
        columnStyles: { 0: { cellWidth: 140, fontStyle: 'bold', textColor: 80 } },
      });
      y = ((doc as any).lastAutoTable?.finalY || y) + 20;
    }

    // Appendix — File index
    // For the ZIP format, each row includes the folder path inside the ZIP so
    // a reader can locate the original file. For the PDF format, we list the
    // files with their area + size but note which were embedded vs skipped.
    const isPdfFile = (mime: string, name: string) =>
      mime === 'application/pdf' || name.toLowerCase().endsWith('.pdf');
    const isImageFile = (mime: string, name: string) =>
      mime.startsWith('image/') ||
      /\.(png|jpe?g|gif|webp)$/i.test(name);

    if (fetchedFiles.length > 0 || missingFiles.length > 0) {
      doc.addPage();
      y = 48;
      heading('Appendix — File index');
      if (fetchedFiles.length > 0) {
        autoTable(doc, {
          startY: y,
          head: outputFormat === 'pdf'
            ? [['Filename', 'Area', 'Size', 'Uploaded', 'By', 'Included']]
            : [['Path inside ZIP', 'Filename', 'Area', 'Size', 'Uploaded', 'By']],
          body: fetchedFiles.map((f) => {
            if (outputFormat === 'pdf') {
              const canEmbed = isPdfFile(f.mimeType, f.name) || isImageFile(f.mimeType, f.name);
              return [
                f.name,
                f.area,
                formatBytes(f.size),
                formatIso(f.uploadedAt),
                f.uploadedBy || '—',
                canEmbed ? 'Yes — see following pages' : 'No — use ZIP variant for originals',
              ];
            }
            return [
              f.path,
              f.name,
              f.area,
              formatBytes(f.size),
              formatIso(f.uploadedAt),
              f.uploadedBy || '—',
            ];
          }),
          styles: { fontSize: 8, cellPadding: 3, valign: 'top' },
          headStyles: { fillColor: [243, 244, 246], textColor: 40 },
        });
        y = ((doc as any).lastAutoTable?.finalY || y) + 16;
      }
      if (missingFiles.length > 0) {
        heading('Files that could not be retrieved', 12);
        autoTable(doc, {
          startY: y,
          head: [['Filename', 'Reason']],
          body: missingFiles.map((f) => [f.name, f.reason]),
          styles: { fontSize: 9, cellPadding: 3, valign: 'top' },
          headStyles: { fillColor: [254, 226, 226], textColor: 40 },
        });
      }
    }

    // ── Finalise output ──────────────────────────────────────────────────
    const datestamp = formatDate(new Date(), 'yyyyMMdd');
    const slug = safeFolderName(activityAcronym || activityTitle || 'activity').toLowerCase();
    const summaryPdfBytes = doc.output('arraybuffer');

    if (outputFormat === 'pdf') {
      // Merge the summary with every PDF evidence doc and embed image evidence
      // as full-page images. Word/Excel/other binaries can't be flattened to
      // PDF — they're listed in the appendix table with an "Included: No" row.
      const merged = await PDFDocument.create();

      // 1) Append the summary
      try {
        const summaryDoc = await PDFDocument.load(summaryPdfBytes);
        const summaryPages = await merged.copyPages(summaryDoc, summaryDoc.getPageIndices());
        summaryPages.forEach((p) => merged.addPage(p));
      } catch (err: any) {
        console.error('[Readiness Export] Failed to append summary PDF:', err);
      }

      // 2) Append each PDF evidence file, then image evidence
      for (const f of fetchedFiles) {
        try {
          if (isPdfFile(f.mimeType, f.name)) {
            const src = await PDFDocument.load(f.bytes, { ignoreEncryption: true });
            const copied = await merged.copyPages(src, src.getPageIndices());
            copied.forEach((p) => merged.addPage(p));
          } else if (isImageFile(f.mimeType, f.name)) {
            const isPng = f.mimeType === 'image/png' || /\.png$/i.test(f.name);
            const image = isPng
              ? await merged.embedPng(f.bytes)
              : await merged.embedJpg(f.bytes);
            // A4 = 595 × 842 pt. Fit the image to fit the page while preserving aspect.
            const page = merged.addPage([595, 842]);
            const margin = 36;
            const maxW = 595 - margin * 2;
            const maxH = 842 - margin * 2;
            const scale = Math.min(maxW / image.width, maxH / image.height, 1);
            const w = image.width * scale;
            const h = image.height * scale;
            page.drawImage(image, {
              x: (595 - w) / 2,
              y: (842 - h) / 2,
              width: w,
              height: h,
            });
          }
          // else: skipped — already noted in the appendix
        } catch (err: any) {
          missingFiles.push({ name: f.name, reason: err?.message || 'Could not embed in single PDF' });
        }
      }

      const mergedBytes = await merged.save();
      const filename = `readiness-package_${slug}_${datestamp}.pdf`;
      const body = new Blob([mergedBytes as unknown as ArrayBuffer], { type: 'application/pdf' });
      return new NextResponse(body, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': String(mergedBytes.byteLength),
          'Cache-Control': 'no-store',
        },
      });
    }

    // ── ZIP output (default) ─────────────────────────────────────────────
    const zip = new JSZip();
    zip.file('00_summary.pdf', summaryPdfBytes);
    for (const f of fetchedFiles) {
      zip.file(f.path, f.bytes);
    }

    // Build ZIP as a Uint8Array — works as BodyInit for NextResponse without
    // the Buffer<ArrayBufferLike> vs BodyInit friction.
    const zipBytes: Uint8Array = await zip.generateAsync({
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const zipFilename = `readiness-package_${slug}_${datestamp}.zip`;
    const zipBody = new Blob([zipBytes as unknown as ArrayBuffer], { type: 'application/zip' });
    return new NextResponse(zipBody, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFilename}"`,
        'Content-Length': String(zipBytes.byteLength),
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('[Readiness Export] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Failed to build readiness package', details: err?.message },
      { status: 500 }
    );
  }
}
