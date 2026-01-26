"use client"

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DocumentCategorySelect } from '@/components/forms/DocumentCategorySelect';
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/searchable-select';
import { X, Loader2, Save, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { COMMON_LANGUAGES } from '@/lib/iatiDocumentLink';
import { UnifiedDocument } from '@/types/library-document';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { apiFetch } from '@/lib/api-fetch';

interface EditDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  document: UnifiedDocument | null;
}

/**
 * Convert a filename like "dfat-design-monitoring-evaluation-learning-standards"
 * to "DFAT Design Monitoring Evaluation Learning Standards"
 */
function formatTitleFromFilename(filename: string): string {
  // Remove file extension
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');

  // Split by hyphens, underscores, or spaces
  const words = nameWithoutExt.split(/[-_\s]+/);

  // Capitalize each word, with special handling for acronyms
  return words.map((word, index) => {
    // Check if it looks like an acronym (all caps or common acronyms)
    const upperWord = word.toUpperCase();
    const commonAcronyms = ['DFAT', 'PDF', 'UN', 'EU', 'UK', 'US', 'USA', 'NGO', 'IATI', 'M&E', 'MEL', 'USAID', 'UNDP', 'WHO', 'FAO', 'WFP'];

    if (commonAcronyms.includes(upperWord) || (word.length <= 4 && word === upperWord)) {
      return upperWord;
    }

    // Capitalize first letter
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
}

export function EditDocumentModal({ isOpen, onClose, onSuccess, document }: EditDocumentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryCode, setCategoryCode] = useState('');
  const [documentDate, setDocumentDate] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [languageCodes, setLanguageCodes] = useState<string[]>(['en']);

  // Organizations for select
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string; acronym?: string; logo?: string }>>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  // Fetch organizations
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const response = await apiFetch('/api/organizations');
        if (response.ok) {
          const data = await response.json();
          setOrganizations(data.organizations || data || []);
        }
      } catch (error) {
        console.error('Error fetching organizations:', error);
      } finally {
        setLoadingOrgs(false);
      }
    };
    fetchOrganizations();
  }, []);

  // Populate form when document changes
  useEffect(() => {
    if (document && isOpen) {
      // Extract title - if empty, format from filename
      const titleNarrative = document.titleNarratives?.[0];
      let docTitle = titleNarrative?.text || document.title || '';

      // If title matches filename pattern, format it nicely
      if (!docTitle && document.fileName) {
        docTitle = formatTitleFromFilename(document.fileName);
      }

      setTitle(docTitle);

      // Extract description
      const descNarrative = document.descriptionNarratives?.[0];
      setDescription(descNarrative?.text || document.description || '');

      // Other fields
      setCategoryCode(document.categoryCode || '');
      setDocumentDate(document.documentDate?.split('T')[0] || '');
      setOrganizationId(document.reportingOrgId || '');
      setLanguageCodes(document.languageCodes || ['en']);
    }
  }, [document, isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setDescription('');
      setCategoryCode('');
      setDocumentDate('');
      setOrganizationId('');
      setLanguageCodes(['en']);
    }
  }, [isOpen]);

  // Add language
  const handleAddLanguage = (code: string) => {
    if (code && !languageCodes.includes(code)) {
      setLanguageCodes([...languageCodes, code]);
    }
  };

  // Remove language
  const handleRemoveLanguage = (code: string) => {
    if (languageCodes.length > 1) {
      setLanguageCodes(languageCodes.filter(c => c !== code));
    }
  };

  // Submit form
  const handleSubmit = async () => {
    if (!document) return;

    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    setIsSubmitting(true);

    try {
      // Extract the actual document ID (remove 'standalone-' prefix if present)
      const docId = document.id.replace('standalone-', '');

      const primaryLang = languageCodes[0] || 'en';
      const updateData = {
        title: [{ text: title.trim(), lang: primaryLang }],
        description: description.trim() ? [{ text: description.trim(), lang: primaryLang }] : null,
        categoryCode: categoryCode || null,
        documentDate: documentDate || null,
        organizationId: organizationId || null,
        languageCodes: languageCodes,
      };

      const response = await apiFetch(`/api/library/${docId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update document');
      }

      toast.success('Document updated successfully');
      onSuccess();
    } catch (error: any) {
      console.error('Error updating document:', error);
      toast.error(error.message || 'Failed to update document');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Organization options
  const orgOptions: SearchableSelectOption[] = organizations.map(org => ({
    value: org.id,
    label: org.acronym ? `${org.name} (${org.acronym})` : org.name,
    icon: org.logo ? (
      <img src={org.logo} alt="" className="h-5 w-5 rounded-sm object-contain flex-shrink-0" />
    ) : (
      <div className="h-5 w-5 rounded-sm bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
          {(org.acronym || org.name || '?')[0].toUpperCase()}
        </span>
      </div>
    ),
  }));

  if (!document) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Document</DialogTitle>
          <DialogDescription>
            Update the metadata for this document.
          </DialogDescription>
        </DialogHeader>

        {/* Document Info (read-only) */}
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <FileText className="h-8 w-8 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{document.fileName || 'External Document'}</p>
            <p className="text-sm text-muted-foreground truncate">{document.url}</p>
          </div>
        </div>

        {/* Editable Fields */}
        <div className="space-y-4 mt-4">
          {/* Title - full width */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Enter document title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter document description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Category - full width */}
          <div className="space-y-2">
            <Label>Document Category</Label>
            <DocumentCategorySelect
              value={categoryCode}
              onValueChange={setCategoryCode}
              placeholder="Select category..."
            />
          </div>

          {/* Document Date - full width */}
          <div className="space-y-2">
            <Label htmlFor="documentDate">Document Date</Label>
            <Input
              id="documentDate"
              type="date"
              value={documentDate}
              onChange={(e) => setDocumentDate(e.target.value)}
            />
          </div>

          {/* Organization - full width */}
          <div className="space-y-2">
            <Label>Associated Organisation</Label>
            <SearchableSelect
              options={orgOptions}
              value={organizationId}
              onValueChange={setOrganizationId}
              placeholder="Select organisation..."
              searchPlaceholder="Search organisations..."
              showValueCode={false}
            />
          </div>

          {/* Document Languages - inline tags in field */}
          <div className="space-y-2">
            <Label>Document Languages</Label>
            <div className="flex flex-wrap items-center gap-1.5 min-h-[40px] px-3 py-2 border rounded-md bg-background">
              {languageCodes.map(code => {
                const lang = COMMON_LANGUAGES.find(l => l.code === code);
                return (
                  <span
                    key={code}
                    className="inline-flex items-center gap-1 bg-muted rounded px-2 py-1 text-sm"
                  >
                    <span className="font-mono text-xs bg-background px-1 py-0.5 rounded">
                      {code.toUpperCase()}
                    </span>
                    <span>{lang?.name || code}</span>
                    {languageCodes.length > 1 && (
                      <button
                        onClick={() => handleRemoveLanguage(code)}
                        className="ml-0.5 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                );
              })}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground">
                    + Add
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[200px] max-h-[300px] overflow-y-auto">
                  {COMMON_LANGUAGES.filter(l => !languageCodes.includes(l.code)).map(lang => (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => handleAddLanguage(lang.code)}
                      className="flex items-center gap-2"
                    >
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded w-8 text-center">
                        {lang.code.toUpperCase()}
                      </span>
                      <span>{lang.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
