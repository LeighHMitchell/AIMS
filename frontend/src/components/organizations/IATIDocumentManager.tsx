"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Plus, Edit2, Trash2, ExternalLink, FileText, Calendar, Globe, Tag, Languages, GripVertical, Loader2, AlertCircle, Upload } from 'lucide-react'
import { toast } from 'sonner'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface DocumentTitle {
  narrative: string;
  language?: string;
}

interface DocumentDescription {
  narrative: string;
  language?: string;
}

interface RecipientCountry {
  code: string;
  narrative?: string;
  language?: string;
}

interface DocumentLink {
  id?: string;
  url: string;
  format?: string;
  documentDate?: string;
  document_date?: string;
  titles: DocumentTitle[];
  descriptions: DocumentDescription[];
  categories: string[];
  languages: string[];
  recipientCountries?: RecipientCountry[];
  recipient_countries?: RecipientCountry[];
  sort_order?: number;
}

interface IATIDocumentManagerProps {
  organizationId?: string;
  // Legacy props for backward compatibility with EditOrganizationModal
  documents?: DocumentLink[];
  onChange?: (documents: DocumentLink[]) => void;
  readOnly?: boolean;
}

// IATI Document Categories (B-series for organization documents)
const DOCUMENT_CATEGORIES = [
  { code: 'B01', label: 'Annual Report', description: 'Annual report describing activities' },
  { code: 'B02', label: 'Institutional Strategy Paper', description: 'Strategy document' },
  { code: 'B03', label: 'Country Strategy Paper', description: 'Country-specific strategy' },
  { code: 'B04', label: 'Aid Allocation Policy', description: 'Policy on aid allocation' },
  { code: 'B05', label: 'Procurement Policy', description: 'Procurement policies and procedures' },
  { code: 'B06', label: 'Institutional Audit Report', description: 'Audit report' },
  { code: 'B07', label: 'Country Audit Report', description: 'Country-specific audit' },
  { code: 'B08', label: 'Exclusions Policy', description: 'Policy on exclusions' },
  { code: 'B09', label: 'Institutional Evaluation Report', description: 'Evaluation report' },
  { code: 'B10', label: 'Country Evaluation Report', description: 'Country-specific evaluation' },
  { code: 'B11', label: 'Sector Strategy', description: 'Sector-specific strategy' },
  { code: 'B12', label: 'Thematic Strategy', description: 'Thematic strategy document' },
  { code: 'B13', label: 'Country/Region Budget', description: 'Budget allocation by country/region' },
  { code: 'B14', label: 'Institutional Budget', description: 'Overall institutional budget' },
  { code: 'B15', label: 'Project Budget', description: 'Project-specific budget' },
  { code: 'B16', label: 'Contracts', description: 'Contract documents' },
  { code: 'B17', label: 'Tender', description: 'Tender documents' },
  { code: 'B18', label: 'Conditions', description: 'Conditions and terms' }
];

const COMMON_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
  { code: 'de', label: 'German' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ar', label: 'Arabic' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ru', label: 'Russian' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' }
];

const COMMON_COUNTRIES = [
  { code: 'AF', name: 'Afghanistan' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'KH', name: 'Cambodia' },
  { code: 'IN', name: 'India' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'LA', name: 'Laos' },
  { code: 'MM', name: 'Myanmar' },
  { code: 'NP', name: 'Nepal' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'PH', name: 'Philippines' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'TH', name: 'Thailand' },
  { code: 'TL', name: 'Timor-Leste' },
  { code: 'VN', name: 'Vietnam' }
];

// Sortable document card component
function SortableDocumentCard({
  document,
  index,
  onEdit,
  onDelete,
  readOnly,
}: {
  document: DocumentLink;
  index: number;
  onEdit: (document: DocumentLink) => void;
  onDelete: (index: number) => void;
  readOnly: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: document.id || `temp-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const primaryTitle = document.titles[0]?.narrative || 'Untitled Document';
  const categoryLabels = document.categories.map(code =>
    DOCUMENT_CATEGORIES.find(cat => cat.code === code)?.label || code
  );
  const recipientCountries = document.recipientCountries || document.recipient_countries || [];
  const docDate = document.documentDate || document.document_date;

  return (
    <Card ref={setNodeRef} style={style} className="mb-3">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-2">
          {!readOnly && (
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing mt-1 text-gray-400 hover:text-gray-600"
            >
              <GripVertical className="h-5 w-5" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <span className="truncate">{primaryTitle}</span>
            </CardTitle>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <a
                href={document.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                View Document
              </a>
              {document.format && (
                <Badge variant="secondary" className="text-xs">
                  {document.format}
                </Badge>
              )}
              {docDate && (
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {docDate}
                </Badge>
              )}
            </div>
          </div>
          {!readOnly && (
            <div className="flex gap-1 ml-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(document)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Descriptions */}
        {document.descriptions.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground">
              {document.descriptions[0].narrative}
            </p>
          </div>
        )}

        {/* Categories */}
        {categoryLabels.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Tag className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            {categoryLabels.map((label, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {label}
              </Badge>
            ))}
          </div>
        )}

        {/* Languages */}
        {document.languages.length > 1 && (
          <div className="flex items-center gap-2">
            <Languages className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <div className="flex gap-1 flex-wrap">
              {document.languages.map((lang, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {COMMON_LANGUAGES.find(l => l.code === lang)?.label || lang.toUpperCase()}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Recipient Countries */}
        {recipientCountries.length > 0 && (
          <div className="flex items-center gap-2">
            <Globe className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <div className="flex gap-1 flex-wrap">
              {recipientCountries.map((country, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {country.narrative || COMMON_COUNTRIES.find(c => c.code === country.code)?.name || country.code}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function IATIDocumentManager({
  organizationId,
  documents: externalDocuments,
  onChange: externalOnChange,
  readOnly = false
}: IATIDocumentManagerProps) {
  // State for self-contained mode (when used in OrganizationEditor)
  const [documents, setDocuments] = useState<DocumentLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [editingDocument, setEditingDocument] = useState<DocumentLink | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Determine if we're in self-contained mode or controlled mode
  const isControlled = externalDocuments !== undefined && externalOnChange !== undefined;

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch documents from API (self-contained mode)
  const fetchDocuments = useCallback(async () => {
    if (!organizationId || isControlled) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/organizations/${organizationId}/documents`);
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }
      const data = await response.json();
      setDocuments(data.map((d: any) => ({
        id: d.id,
        url: d.url,
        format: d.format,
        documentDate: d.document_date,
        titles: d.titles || [],
        descriptions: d.descriptions || [],
        categories: d.categories || [],
        languages: d.languages || ['en'],
        recipientCountries: d.recipient_countries || [],
        sort_order: d.sort_order,
      })));
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [organizationId, isControlled]);

  // Fetch documents on mount
  useEffect(() => {
    if (organizationId && !isControlled) {
      fetchDocuments();
    }
  }, [organizationId, isControlled, fetchDocuments]);

  // Get documents from appropriate source
  const currentDocuments = isControlled ? (externalDocuments || []) : documents;

  // Update documents
  const updateDocuments = (newDocs: DocumentLink[]) => {
    if (isControlled && externalOnChange) {
      externalOnChange(newDocs);
    } else {
      setDocuments(newDocs);
    }
  };

  // Handle drag end for reordering
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = currentDocuments.findIndex(d => (d.id || `temp-${currentDocuments.indexOf(d)}`) === active.id);
      const newIndex = currentDocuments.findIndex(d => (d.id || `temp-${currentDocuments.indexOf(d)}`) === over.id);

      const newOrder = arrayMove(currentDocuments, oldIndex, newIndex);
      updateDocuments(newOrder);

      // Save new order to API if in self-contained mode
      if (!isControlled && organizationId) {
        try {
          await fetch(`/api/organizations/${organizationId}/documents`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              documents: newOrder.map((doc, idx) => ({
                id: doc.id,
                sort_order: idx,
              })),
            }),
          });
        } catch (err) {
          console.error('Error saving document order:', err);
          toast.error('Failed to save document order');
        }
      }
    }
  };

  const handleAddDocument = () => {
    setEditingDocument({
      url: '',
      titles: [{ narrative: '', language: 'en' }],
      descriptions: [],
      categories: [],
      languages: ['en'],
      recipientCountries: []
    });
    setModalOpen(true);
  };

  const handleEditDocument = (document: DocumentLink) => {
    setEditingDocument({
      ...document,
      recipientCountries: document.recipientCountries || document.recipient_countries || [],
      documentDate: document.documentDate || document.document_date,
    });
    setModalOpen(true);
  };

  const handleDeleteDocument = async (documentIndex: number) => {
    const docToDelete = currentDocuments[documentIndex];

    if (isControlled) {
      const newDocuments = currentDocuments.filter((_, index) => index !== documentIndex);
      updateDocuments(newDocuments);
      return;
    }

    if (!organizationId || !docToDelete.id) {
      const newDocuments = currentDocuments.filter((_, index) => index !== documentIndex);
      updateDocuments(newDocuments);
      return;
    }

    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/documents?documentId=${docToDelete.id}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      const newDocuments = currentDocuments.filter((_, index) => index !== documentIndex);
      updateDocuments(newDocuments);
      toast.success('Document deleted');
    } catch (err) {
      console.error('Error deleting document:', err);
      toast.error('Failed to delete document');
    }
  };

  const handleSaveDocument = async () => {
    if (!editingDocument) return;

    // Validate required fields
    if (!editingDocument.url.trim()) {
      toast.error('Document URL is required');
      return;
    }

    if (editingDocument.titles.length === 0 || !editingDocument.titles[0].narrative.trim()) {
      toast.error('Document title is required');
      return;
    }

    setSaving(true);

    try {
      if (isControlled) {
        // Controlled mode - just update local state
        const existingIndex = currentDocuments.findIndex(d => d.id === editingDocument.id);
        let newDocuments;

        if (existingIndex >= 0) {
          newDocuments = [...currentDocuments];
          newDocuments[existingIndex] = editingDocument;
        } else {
          newDocuments = [...currentDocuments, { ...editingDocument, id: `temp-${Date.now()}` }];
        }

        updateDocuments(newDocuments);
        setModalOpen(false);
        setEditingDocument(null);
        toast.success('Document saved');
        return;
      }

      // Self-contained mode - save to API
      if (!organizationId) {
        toast.error('Organization ID is required');
        return;
      }

      const isEditing = editingDocument.id && !editingDocument.id.startsWith('temp-');

      const payload = {
        id: isEditing ? editingDocument.id : undefined,
        url: editingDocument.url,
        format: editingDocument.format,
        documentDate: editingDocument.documentDate,
        titles: editingDocument.titles,
        descriptions: editingDocument.descriptions,
        categories: editingDocument.categories,
        languages: editingDocument.languages,
        recipientCountries: editingDocument.recipientCountries,
      };

      const response = await fetch(`/api/organizations/${organizationId}/documents`, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to save document');
      }

      const savedDoc = await response.json();

      // Update local state
      if (isEditing) {
        const newDocuments = currentDocuments.map(d =>
          d.id === editingDocument.id ? {
            ...savedDoc,
            documentDate: savedDoc.document_date,
            recipientCountries: savedDoc.recipient_countries,
          } : d
        );
        updateDocuments(newDocuments);
      } else {
        updateDocuments([...currentDocuments, {
          ...savedDoc,
          documentDate: savedDoc.document_date,
          recipientCountries: savedDoc.recipient_countries,
        }]);
      }

      setModalOpen(false);
      setEditingDocument(null);
      toast.success(isEditing ? 'Document updated' : 'Document added');
    } catch (err) {
      console.error('Error saving document:', err);
      toast.error('Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  const updateEditingDocument = (updates: Partial<DocumentLink>) => {
    if (editingDocument) {
      setEditingDocument({ ...editingDocument, ...updates });
    }
  };

  const addTitle = () => {
    if (editingDocument) {
      updateEditingDocument({
        titles: [...editingDocument.titles, { narrative: '', language: 'en' }]
      });
    }
  };

  const updateTitle = (index: number, updates: Partial<DocumentTitle>) => {
    if (editingDocument) {
      const newTitles = [...editingDocument.titles];
      newTitles[index] = { ...newTitles[index], ...updates };
      updateEditingDocument({ titles: newTitles });
    }
  };

  const removeTitle = (index: number) => {
    if (editingDocument && editingDocument.titles.length > 1) {
      const newTitles = editingDocument.titles.filter((_, i) => i !== index);
      updateEditingDocument({ titles: newTitles });
    }
  };

  const addDescription = () => {
    if (editingDocument) {
      updateEditingDocument({
        descriptions: [...editingDocument.descriptions, { narrative: '', language: 'en' }]
      });
    }
  };

  const updateDescription = (index: number, updates: Partial<DocumentDescription>) => {
    if (editingDocument) {
      const newDescriptions = [...editingDocument.descriptions];
      newDescriptions[index] = { ...newDescriptions[index], ...updates };
      updateEditingDocument({ descriptions: newDescriptions });
    }
  };

  const removeDescription = (index: number) => {
    if (editingDocument) {
      const newDescriptions = editingDocument.descriptions.filter((_, i) => i !== index);
      updateEditingDocument({ descriptions: newDescriptions });
    }
  };

  const addRecipientCountry = () => {
    if (editingDocument) {
      const currentCountries = editingDocument.recipientCountries || [];
      updateEditingDocument({
        recipientCountries: [...currentCountries, { code: '', narrative: '', language: 'en' }]
      });
    }
  };

  const updateRecipientCountry = (index: number, updates: Partial<RecipientCountry>) => {
    if (editingDocument) {
      const currentCountries = editingDocument.recipientCountries || [];
      const newCountries = [...currentCountries];
      newCountries[index] = { ...newCountries[index], ...updates };
      updateEditingDocument({ recipientCountries: newCountries });
    }
  };

  const removeRecipientCountry = (index: number) => {
    if (editingDocument) {
      const currentCountries = editingDocument.recipientCountries || [];
      const newCountries = currentCountries.filter((_, i) => i !== index);
      updateEditingDocument({ recipientCountries: newCountries });
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading documents...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-red-500">
        <AlertCircle className="h-6 w-6 mr-2" />
        <span>{error}</span>
        <Button variant="link" onClick={fetchDocuments} className="ml-2">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">IATI Documents</h3>
          <p className="text-sm text-muted-foreground">
            Manage organization document links according to IATI standards. Drag to reorder.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            {currentDocuments.length} document{currentDocuments.length !== 1 ? 's' : ''}
          </div>
          {!readOnly && (
            <Button onClick={handleAddDocument}>
              <Plus className="h-4 w-4 mr-2" />
              Add Document
            </Button>
          )}
        </div>
      </div>

      <div>
        {currentDocuments.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={currentDocuments.map((d, i) => d.id || `temp-${i}`)}
              strategy={verticalListSortingStrategy}
            >
              {currentDocuments.map((document, index) => (
                <SortableDocumentCard
                  key={document.id || `temp-${index}`}
                  document={document}
                  index={index}
                  onEdit={handleEditDocument}
                  onDelete={handleDeleteDocument}
                  readOnly={readOnly}
                />
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <Upload className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">No documents added yet</p>
            {!readOnly && (
              <Button variant="outline" onClick={handleAddDocument}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Document
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Document Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDocument?.id ? 'Edit Document' : 'Add Document'}
            </DialogTitle>
          </DialogHeader>

          {editingDocument && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="font-medium">Basic Information</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Document URL *</Label>
                    <Input
                      type="url"
                      placeholder="https://example.org/document.pdf"
                      value={editingDocument.url}
                      onChange={(e) => updateEditingDocument({ url: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Format</Label>
                    <Input
                      placeholder="application/pdf"
                      value={editingDocument.format || ''}
                      onChange={(e) => updateEditingDocument({ format: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Document Date</Label>
                  <Input
                    type="date"
                    value={editingDocument.documentDate || ''}
                    onChange={(e) => updateEditingDocument({ documentDate: e.target.value })}
                  />
                </div>
              </div>

              <Separator />

              {/* Titles */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Titles *</h4>
                  <Button variant="outline" size="sm" onClick={addTitle}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Title
                  </Button>
                </div>

                <div className="space-y-3">
                  {editingDocument.titles.map((title, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="Document title"
                        value={title.narrative}
                        onChange={(e) => updateTitle(index, { narrative: e.target.value })}
                        className="flex-1"
                      />
                      <Select
                        value={title.language || 'en'}
                        onValueChange={(value) => updateTitle(index, { language: value })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COMMON_LANGUAGES.map((lang) => (
                            <SelectItem key={lang.code} value={lang.code}>
                              {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {editingDocument.titles.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTitle(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Descriptions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Descriptions</h4>
                  <Button variant="outline" size="sm" onClick={addDescription}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Description
                  </Button>
                </div>

                <div className="space-y-3">
                  {editingDocument.descriptions.map((description, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex gap-2">
                        <Select
                          value={description.language || 'en'}
                          onValueChange={(value) => updateDescription(index, { language: value })}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COMMON_LANGUAGES.map((lang) => (
                              <SelectItem key={lang.code} value={lang.code}>
                                {lang.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDescription(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <Textarea
                        placeholder="Document description"
                        value={description.narrative}
                        onChange={(e) => updateDescription(index, { narrative: e.target.value })}
                        rows={3}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Categories */}
              <div className="space-y-4">
                <h4 className="font-medium">Categories</h4>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {DOCUMENT_CATEGORIES.map((category) => (
                    <label key={category.code} className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingDocument.categories.includes(category.code)}
                        onChange={(e) => {
                          const categories = e.target.checked
                            ? [...editingDocument.categories, category.code]
                            : editingDocument.categories.filter(c => c !== category.code);
                          updateEditingDocument({ categories });
                        }}
                        className="mt-0.5"
                      />
                      <div className="text-sm">
                        <div className="font-medium">{category.code} - {category.label}</div>
                        <div className="text-muted-foreground text-xs">{category.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Languages */}
              <div className="space-y-4">
                <h4 className="font-medium">Document Languages</h4>
                <div className="grid grid-cols-3 gap-2">
                  {COMMON_LANGUAGES.map((language) => (
                    <label key={language.code} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingDocument.languages.includes(language.code)}
                        onChange={(e) => {
                          const languages = e.target.checked
                            ? [...editingDocument.languages, language.code]
                            : editingDocument.languages.filter(l => l !== language.code);
                          updateEditingDocument({ languages });
                        }}
                      />
                      <span className="text-sm">{language.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Recipient Countries */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Recipient Countries</h4>
                  <Button variant="outline" size="sm" onClick={addRecipientCountry}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Country
                  </Button>
                </div>

                <div className="space-y-3">
                  {(editingDocument.recipientCountries || []).map((country, index) => (
                    <div key={index} className="flex gap-2">
                      <Select
                        value={country.code}
                        onValueChange={(value) => updateRecipientCountry(index, { code: value })}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Country" />
                        </SelectTrigger>
                        <SelectContent>
                          {COMMON_COUNTRIES.map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Country name override"
                        value={country.narrative || ''}
                        onChange={(e) => updateRecipientCountry(index, { narrative: e.target.value })}
                        className="flex-1"
                      />
                      <Select
                        value={country.language || 'en'}
                        onValueChange={(value) => updateRecipientCountry(index, { language: value })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COMMON_LANGUAGES.map((lang) => (
                            <SelectItem key={lang.code} value={lang.code}>
                              {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRecipientCountry(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveDocument} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Document'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
