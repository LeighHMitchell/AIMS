"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-fetch';
import { listHelpPageOptions } from '@/lib/help-page-slugs';
import { PageHelpCard } from '@/components/help/PageHelpCard';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';

interface HelpRow {
  id: string;
  page_slug: string;
  question: string;
  answer: string;
  display_order: number;
  published: boolean;
  created_at: string;
  updated_at: string;
}

const QUESTION_MAX = 200;
const ANSWER_MAX = 2000;

const pageOptions = listHelpPageOptions();

export function PageHelpManagement() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editIdFromUrl = searchParams?.get('edit') ?? null;

  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [rows, setRows] = useState<HelpRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSlug, setFilterSlug] = useState<string>(pageOptions[0]?.slug ?? '');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<HelpRow | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [fSlug, setFSlug] = useState('');
  const [fQuestion, setFQuestion] = useState('');
  const [fAnswer, setFAnswer] = useState('');
  const [fOrder, setFOrder] = useState<number>(0);
  const [fPublished, setFPublished] = useState(false);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/admin/page-help');
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Failed to load');
      const json = await res.json();
      setRows(json.data ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load help content');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  // Auto-open editor when deep-linked from live bubble (`?edit=<id>`)
  useEffect(() => {
    if (!editIdFromUrl || rows.length === 0) return;
    const target = rows.find((r) => r.id === editIdFromUrl);
    if (target) openEdit(target);
  }, [editIdFromUrl, rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredRows = useMemo(
    () => rows.filter((r) => (filterSlug ? r.page_slug === filterSlug : true)),
    [rows, filterSlug]
  );

  const previewItems = useMemo(
    () =>
      filteredRows
        .filter((r) => r.published)
        .sort((a, b) => a.display_order - b.display_order)
        .map((r) => ({
          id: r.id,
          page_slug: r.page_slug,
          question: r.question,
          answer: r.answer,
          display_order: r.display_order,
          updated_at: r.updated_at,
        })),
    [filteredRows]
  );

  const openCreate = () => {
    setEditing(null);
    setFSlug(filterSlug || pageOptions[0]?.slug || '');
    setFQuestion('');
    setFAnswer('');
    setFOrder((filteredRows.at(-1)?.display_order ?? 0) + 1);
    setFPublished(false);
    setDialogOpen(true);
  };

  const openEdit = (row: HelpRow) => {
    setEditing(row);
    setFSlug(row.page_slug);
    setFQuestion(row.question);
    setFAnswer(row.answer);
    setFOrder(row.display_order);
    setFPublished(row.published);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (saving) return;
    setDialogOpen(false);
    // Strip `edit=` from URL so the deep-link doesn't re-trigger
    if (editIdFromUrl) {
      const params = new URLSearchParams(searchParams?.toString() || '');
      params.delete('edit');
      router.replace(`/admin?${params.toString()}`, { scroll: false });
    }
  };

  const handleSave = async () => {
    if (!fSlug) return toast.error('Page is required');
    if (!fQuestion.trim()) return toast.error('Question is required');
    if (fQuestion.length > QUESTION_MAX) return toast.error(`Question exceeds ${QUESTION_MAX} chars`);
    if (!fAnswer.trim()) return toast.error('Answer is required');
    if (fAnswer.length > ANSWER_MAX) return toast.error(`Answer exceeds ${ANSWER_MAX} chars`);

    setSaving(true);
    try {
      const payload = {
        page_slug: fSlug,
        question: fQuestion.trim(),
        answer: fAnswer.trim(),
        display_order: Number.isFinite(fOrder) ? fOrder : 0,
        published: fPublished,
      };
      const res = editing
        ? await apiFetch('/api/admin/page-help', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: editing.id, ...payload }),
          })
        : await apiFetch('/api/admin/page-help', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Save failed');
      toast.success(editing ? 'Updated' : 'Created');
      closeDialog();
      await fetchRows();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: HelpRow) => {
    const ok = await confirm({
      title: 'Delete help item?',
      description: `"${row.question}" will be permanently removed.`,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      const res = await apiFetch(`/api/admin/page-help?id=${row.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Delete failed');
      toast.success('Deleted');
      await fetchRows();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const togglePublished = async (row: HelpRow) => {
    try {
      const res = await apiFetch('/api/admin/page-help', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, published: !row.published }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Toggle failed');
      await fetchRows();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Toggle failed');
    }
  };

  return (
    <div className="space-y-4">
      <ConfirmDialog />
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Page Help</CardTitle>
            <CardDescription>
              Manage the contextual help bubble that appears on each page. Each page has its own
              set of questions shown to users in a floating card.
            </CardDescription>
          </div>
          <Button onClick={openCreate} className="gap-1.5">
            <Plus className="h-4 w-4" /> New Question
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-4">
            <Label htmlFor="slug-filter" className="text-sm">
              Page
            </Label>
            <Select value={filterSlug} onValueChange={setFilterSlug}>
              <SelectTrigger id="slug-filter" className="w-[240px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageOptions.map((opt) => (
                  <SelectItem key={opt.slug} value={opt.slug}>
                    {opt.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
            {/* Table */}
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">#</TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead className="w-[110px]">Status</TableHead>
                    <TableHead className="w-[160px] text-right whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                        Loading…
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading &&
                    filteredRows
                      .slice()
                      .sort((a, b) => a.display_order - b.display_order)
                      .map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-mono text-xs">{row.display_order}</TableCell>
                          <TableCell className="max-w-[480px]">
                            <div className="truncate font-medium">{row.question}</div>
                            <div className="truncate text-xs text-muted-foreground">
                              {row.answer.replace(/\s+/g, ' ').slice(0, 100)}
                              {row.answer.length > 100 ? '…' : ''}
                            </div>
                          </TableCell>
                          <TableCell>
                            {row.published ? (
                              <span className="inline-flex items-center gap-1.5 text-sm text-green-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                                Published
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                                Draft
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-0.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => togglePublished(row)}
                                title={row.published ? 'Unpublish' : 'Publish'}
                              >
                                {row.published ? (
                                  <ToggleRight className="h-5 w-5 text-green-600" />
                                ) : (
                                  <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                                )}
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => openEdit(row)} title="Edit" aria-label="Edit">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(row)} title="Delete" aria-label="Delete">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  {!loading && filteredRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No help content for this page yet — click “New Question” to add one.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Live preview */}
            <div>
              <div className="text-sm font-medium mb-1">Live preview</div>
              <p className="text-xs text-muted-foreground mb-3">
                How this page&rsquo;s published help will appear to users.
              </p>
              <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 bg-surface-muted/30">
                <div className="border rounded-md bg-background shadow-sm overflow-hidden">
                    <PageHelpCard
                    pageSlug={filterSlug}
                    pageTitle={pageOptions.find((o) => o.slug === filterSlug)?.title ?? filterSlug}
                    items={previewItems}
                    loading={false}
                    error={null}
                    onClose={() => {
                      /* preview — no-op */
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader className="bg-surface-muted -mx-6 -mt-6 px-6 pt-6 pb-4 border-b rounded-t-lg">
            <DialogTitle>{editing ? 'Edit Help Question' : 'New Help Question'}</DialogTitle>
            <DialogDescription>
              Keep questions scannable. Answers support basic markdown: **bold**, *italic*, lists
              (<code>- item</code>), and [links](https://example.com).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="f-slug">Page</Label>
              <Select value={fSlug} onValueChange={setFSlug}>
                <SelectTrigger id="f-slug">
                  <SelectValue placeholder="Select a page" />
                </SelectTrigger>
                <SelectContent>
                  {pageOptions.map((opt) => (
                    <SelectItem key={opt.slug} value={opt.slug}>
                      {opt.title} <span className="text-muted-foreground">({opt.slug})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="f-question">Question</Label>
                <span className="text-xs text-muted-foreground">
                  {fQuestion.length}/{QUESTION_MAX}
                </span>
              </div>
              <Input
                id="f-question"
                value={fQuestion}
                onChange={(e) => setFQuestion(e.target.value.slice(0, QUESTION_MAX))}
                placeholder="e.g. What can I do on this page?"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="f-answer">Answer (markdown)</Label>
                <span className="text-xs text-muted-foreground">
                  {fAnswer.length}/{ANSWER_MAX}
                </span>
              </div>
              <Textarea
                id="f-answer"
                rows={8}
                value={fAnswer}
                onChange={(e) => setFAnswer(e.target.value.slice(0, ANSWER_MAX))}
                placeholder="Supports **bold**, *italic*, lists, and [links](https://...)"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="f-order">Display order</Label>
                <Input
                  id="f-order"
                  type="number"
                  value={fOrder}
                  onChange={(e) => setFOrder(parseInt(e.target.value, 10) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-pub">Status</Label>
                <div className="flex items-center gap-2 h-10">
                  <input
                    id="f-pub"
                    type="checkbox"
                    checked={fPublished}
                    onChange={(e) => setFPublished(e.target.checked)}
                  />
                  <Label htmlFor="f-pub" className="text-sm font-normal cursor-pointer">
                    Published (visible to users)
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editing ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
