"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LoadingText } from '@/components/ui/loading-text'
import { Search, Plus, Pencil, Trash2, Save, Loader2, BookOpen, ChevronsUpDown } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api-fetch'
import { useConfirmDialog } from '@/hooks/use-confirm-dialog'

interface GlossaryTermRow {
  id: string
  term: string
  category: string
  simple_definition: string
  detailed_definition: string
  created_at: string
  updated_at: string
}

const EMPTY_FORM = {
  term: '',
  category: '',
  simple_definition: '',
  detailed_definition: '',
}

export function GlossaryManagement() {
  const { confirm, ConfirmDialog } = useConfirmDialog()
  const [terms, setTerms] = useState<GlossaryTermRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTerm, setEditingTerm] = useState<GlossaryTermRow | null>(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  const fetchTerms = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiFetch('/api/glossary')
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'Failed to fetch glossary terms')
      }
      setTerms(await response.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load glossary terms')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTerms()
  }, [])

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(terms.map(t => t.category))).sort()],
    [terms]
  )

  const filteredTerms = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return terms.filter(t => {
      const matchesSearch =
        !query ||
        t.term.toLowerCase().includes(query) ||
        t.simple_definition.toLowerCase().includes(query) ||
        t.detailed_definition.toLowerCase().includes(query)
      const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [terms, searchTerm, selectedCategory])

  const openCreateModal = () => {
    setEditingTerm(null)
    setFormData(EMPTY_FORM)
    setIsModalOpen(true)
  }

  const openEditModal = (term: GlossaryTermRow) => {
    setEditingTerm(term)
    setFormData({
      term: term.term,
      category: term.category,
      simple_definition: term.simple_definition,
      detailed_definition: term.detailed_definition,
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingTerm(null)
    setFormData(EMPTY_FORM)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const response = editingTerm
        ? await apiFetch(`/api/glossary/${editingTerm.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
          })
        : await apiFetch('/api/glossary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
          })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'Failed to save glossary term')
      }

      toast.success(editingTerm ? 'Glossary term updated' : 'Glossary term added')
      closeModal()
      fetchTerms()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save glossary term')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (term: GlossaryTermRow) => {
    if (
      !(await confirm({
        title: `Delete "${term.term}"?`,
        description: 'The term will be removed from the Glossary page for all users. This action cannot be undone.',
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
      }))
    ) {
      return
    }

    const previousTerms = [...terms]
    setTerms(terms.filter(t => t.id !== term.id))

    try {
      const response = await apiFetch(`/api/glossary/${term.id}`, { method: 'DELETE' })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'Failed to delete glossary term')
      }
      toast('Glossary term deleted')
    } catch (err) {
      setTerms(previousTerms)
      toast.error(err instanceof Error ? err.message : 'Failed to delete glossary term')
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Glossary Terms</CardTitle>
            <CardDescription>
              Manage the terms and definitions shown on the Glossary page under Support.
            </CardDescription>
          </div>
          <Button onClick={openCreateModal} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Term
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search terms and definitions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-accent/50 transition-colors appearance-none pr-8 min-w-[200px]"
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <ChevronsUpDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 shrink-0 opacity-50 pointer-events-none" />
          </div>
        </div>

        {/* Term table */}
        {loading ? (
          <div className="py-12 text-center">
            <LoadingText>Loading glossary terms...</LoadingText>
          </div>
        ) : error ? (
          <div className="py-12 text-center space-y-3">
            <BookOpen className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={fetchTerms}>Try Again</Button>
          </div>
        ) : filteredTerms.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <BookOpen className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">
              {terms.length === 0
                ? 'No glossary terms yet. Add the first one.'
                : 'No terms match your search or filter.'}
            </p>
          </div>
        ) : (
          <div className="border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[220px]">Term</TableHead>
                  <TableHead className="w-[200px]">Category</TableHead>
                  <TableHead>Simple Definition</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTerms.map(term => (
                  <TableRow key={term.id}>
                    <TableCell className="font-medium align-top">{term.term}</TableCell>
                    <TableCell className="align-top">
                      <Badge variant="secondary">{term.category}</Badge>
                    </TableCell>
                    <TableCell className="align-top text-muted-foreground">
                      {term.simple_definition}
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(term)}
                          className="h-8 w-8 p-0"
                          title="Edit term"
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(term)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Delete term"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {!loading && !error && (
          <p className="text-helper text-muted-foreground">
            Showing {filteredTerms.length} of {terms.length} terms
          </p>
        )}
      </CardContent>

      {/* Create / edit modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTerm ? 'Edit Glossary Term' : 'Add Glossary Term'}</DialogTitle>
            <DialogDescription>
              {editingTerm
                ? 'Update the term, its category, or either of its definitions.'
                : 'Enter the term with a plain-language definition and a more detailed technical one.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="glossary-term">Term</Label>
                <Input
                  id="glossary-term"
                  value={formData.term}
                  onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                  placeholder="e.g., Disbursement"
                  required
                />
              </div>
              <div>
                <Label htmlFor="glossary-category">Category</Label>
                <Input
                  id="glossary-category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Finance & Transactions"
                  list="glossary-categories"
                  required
                />
                <datalist id="glossary-categories">
                  {categories.filter(c => c !== 'All').map(category => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <Label htmlFor="glossary-simple">Simple definition</Label>
              <Textarea
                id="glossary-simple"
                value={formData.simple_definition}
                onChange={(e) => setFormData({ ...formData, simple_definition: e.target.value })}
                placeholder="One plain-language sentence a non-technical user will understand..."
                rows={2}
                required
              />
            </div>

            <div>
              <Label htmlFor="glossary-detailed">Detailed definition</Label>
              <Textarea
                id="glossary-detailed"
                value={formData.detailed_definition}
                onChange={(e) => setFormData({ ...formData, detailed_definition: e.target.value })}
                placeholder="The fuller technical explanation, aligned with IATI / OECD DAC terminology..."
                rows={5}
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    <LoadingText>Saving...</LoadingText>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {editingTerm ? 'Update Term' : 'Add Term'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog />
    </Card>
  )
}
