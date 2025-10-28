"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Plus, Edit2, Trash2, ExternalLink, FileText, Calendar, Globe, Tag, Languages } from 'lucide-react'

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
  titles: DocumentTitle[];
  descriptions: DocumentDescription[];
  categories: string[];
  languages: string[];
  recipientCountries: RecipientCountry[];
}

interface IATIDocumentManagerProps {
  organizationId?: string;
  documents: DocumentLink[];
  onChange: (documents: DocumentLink[]) => void;
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

export function IATIDocumentManager({ 
  organizationId, 
  documents, 
  onChange, 
  readOnly = false 
}: IATIDocumentManagerProps) {
  const [editingDocument, setEditingDocument] = useState<DocumentLink | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

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
    setEditingDocument({ ...document });
    setModalOpen(true);
  };

  const handleDeleteDocument = (documentIndex: number) => {
    const newDocuments = documents.filter((_, index) => index !== documentIndex);
    onChange(newDocuments);
  };

  const handleSaveDocument = () => {
    if (!editingDocument) return;

    // Validate required fields
    if (!editingDocument.url.trim()) {
      alert('Document URL is required');
      return;
    }

    if (editingDocument.titles.length === 0 || !editingDocument.titles[0].narrative.trim()) {
      alert('Document title is required');
      return;
    }

    const existingIndex = documents.findIndex(d => d.id === editingDocument.id);
    let newDocuments;

    if (existingIndex >= 0) {
      newDocuments = [...documents];
      newDocuments[existingIndex] = editingDocument;
    } else {
      newDocuments = [...documents, { ...editingDocument, id: `temp-${Date.now()}` }];
    }

    onChange(newDocuments);
    setModalOpen(false);
    setEditingDocument(null);
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
      updateEditingDocument({
        recipientCountries: [...editingDocument.recipientCountries, { code: '', narrative: '', language: 'en' }]
      });
    }
  };

  const updateRecipientCountry = (index: number, updates: Partial<RecipientCountry>) => {
    if (editingDocument) {
      const newCountries = [...editingDocument.recipientCountries];
      newCountries[index] = { ...newCountries[index], ...updates };
      updateEditingDocument({ recipientCountries: newCountries });
    }
  };

  const removeRecipientCountry = (index: number) => {
    if (editingDocument) {
      const newCountries = editingDocument.recipientCountries.filter((_, i) => i !== index);
      updateEditingDocument({ recipientCountries: newCountries });
    }
  };

  const renderDocumentCard = (document: DocumentLink, index: number) => {
    const primaryTitle = document.titles[0]?.narrative || 'Untitled Document';
    const categoryLabels = document.categories.map(code => 
      DOCUMENT_CATEGORIES.find(cat => cat.code === code)?.label || code
    );

    return (
      <Card key={document.id || index} className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <span className="truncate">{primaryTitle}</span>
              </CardTitle>
              <div className="flex items-center gap-2 mt-2">
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
                {document.documentDate && (
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {document.documentDate}
                  </Badge>
                )}
              </div>
            </div>
            {!readOnly && (
              <div className="flex gap-1 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditDocument(document)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteDocument(index)}
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
              <Tag className="h-3 w-3 text-muted-foreground" />
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
              <Languages className="h-3 w-3 text-muted-foreground" />
              <div className="flex gap-1">
                {document.languages.map((lang, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {COMMON_LANGUAGES.find(l => l.code === lang)?.label || lang.toUpperCase()}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Recipient Countries */}
          {document.recipientCountries.length > 0 && (
            <div className="flex items-center gap-2">
              <Globe className="h-3 w-3 text-muted-foreground" />
              <div className="flex gap-1 flex-wrap">
                {document.recipientCountries.map((country, i) => (
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
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">IATI Documents</h3>
          <p className="text-sm text-muted-foreground">
            Manage organization document links according to IATI standards
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            {documents.length} document{documents.length !== 1 ? 's' : ''}
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
        {documents.length > 0 ? (
          documents.map((document, index) => renderDocumentCard(document, index))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {!readOnly && (
              <Button
                variant="outline"
                onClick={handleAddDocument}
              >
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
                  {editingDocument.recipientCountries.map((country, index) => (
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
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDocument}>
              Save Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
