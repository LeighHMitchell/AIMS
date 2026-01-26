"use client"

import React, { useState, useEffect, useCallback } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentCategorySelect } from '@/components/forms/DocumentCategorySelect';
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/searchable-select';
import { Upload, Link2, X, Plus, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { COMMON_LANGUAGES, inferMimeFromUrl, FILE_FORMATS } from '@/lib/iatiDocumentLink';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { apiFetch } from '@/lib/api-fetch';

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
  return words.map((word) => {
    const upperWord = word.toUpperCase();
    const commonAcronyms = ['DFAT', 'PDF', 'UN', 'EU', 'UK', 'US', 'USA', 'NGO', 'IATI', 'M&E', 'MEL', 'USAID', 'UNDP', 'WHO', 'FAO', 'WFP'];

    if (commonAcronyms.includes(upperWord) || (word.length <= 4 && word === upperWord)) {
      return upperWord;
    }

    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
}

interface AddDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddDocumentModal({ isOpen, onClose, onSuccess }: AddDocumentModalProps) {
  const [uploadMode, setUploadMode] = useState<'upload' | 'url'>('upload');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryCode, setCategoryCode] = useState('');
  const [documentDate, setDocumentDate] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [languageCodes, setLanguageCodes] = useState<string[]>(['en']);
  const [recipientCountries, setRecipientCountries] = useState<string[]>([]);
  
  // Organizations for select
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string; acronym?: string; logo?: string }>>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);

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

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setUrl('');
      setFormat('');
      setTitle('');
      setDescription('');
      setCategoryCode('');
      setDocumentDate('');
      setOrganizationId('');
      setLanguageCodes(['en']);
      setRecipientCountries([]);
      setUploadMode('upload');
    }
  }, [isOpen]);

  // Auto-detect format from URL
  useEffect(() => {
    if (uploadMode === 'url' && url) {
      const detectedMime = inferMimeFromUrl(url);
      if (detectedMime) {
        setFormat(detectedMime);
      }
    }
  }, [url, uploadMode]);

  // Auto-detect format from file and set formatted title
  useEffect(() => {
    if (file) {
      setFormat(file.type);
      if (!title) {
        setTitle(formatTitleFromFilename(file.name));
      }
    }
  }, [file]);

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setUploadMode('upload');
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  // Add language
  const handleAddLanguage = (code: string) => {
    if (code && !languageCodes.includes(code)) {
      setLanguageCodes([...languageCodes, code]);
    }
  };

  // Remove language (keep at least one)
  const handleRemoveLanguage = (code: string) => {
    if (languageCodes.length > 1) {
      setLanguageCodes(languageCodes.filter(c => c !== code));
    }
  };

  // Submit form
  const handleSubmit = async () => {
    // Validation
    if (uploadMode === 'upload' && !file) {
      toast.error('Please select a file to upload');
      return;
    }
    
    if (uploadMode === 'url' && !url) {
      toast.error('Please enter a URL');
      return;
    }
    
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      
      if (uploadMode === 'upload' && file) {
        formData.append('file', file);
        formData.append('isExternal', 'false');
      } else {
        formData.append('url', url);
        formData.append('isExternal', 'true');
      }

      // Add metadata - use first document language for title/description
      const primaryLang = languageCodes[0] || 'en';
      formData.append('title', JSON.stringify([{ text: title.trim(), lang: primaryLang }]));

      if (description.trim()) {
        formData.append('description', JSON.stringify([{ text: description.trim(), lang: primaryLang }]));
      }
      
      if (format) {
        formData.append('format', format);
      }
      
      if (categoryCode) {
        formData.append('categoryCode', categoryCode);
      }
      
      if (documentDate) {
        formData.append('documentDate', documentDate);
      }
      
      if (organizationId) {
        formData.append('organizationId', organizationId);
      }
      
      if (languageCodes.length > 0) {
        formData.append('languageCodes', JSON.stringify(languageCodes));
      }
      
      if (recipientCountries.length > 0) {
        formData.append('recipientCountries', JSON.stringify(recipientCountries));
      }

      const response = await apiFetch('/api/library/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload document');
      }

      toast.success('Document added successfully');
      onSuccess();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error(error.message || 'Failed to upload document');
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

  // Language options
  const languageOptions: SearchableSelectOption[] = COMMON_LANGUAGES.map(lang => ({
    value: lang.code,
    label: `${lang.name} (${lang.code})`,
  }));

  // Format options
  const formatOptions: SearchableSelectOption[] = Object.entries(FILE_FORMATS).map(([mime, label]) => ({
    value: mime,
    label: `${label} (${mime})`,
  }));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Document to Library</DialogTitle>
          <DialogDescription>
            Upload a file or add an external URL to the document library.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as 'upload' | 'url')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </TabsTrigger>
            <TabsTrigger value="url">
              <Link2 className="h-4 w-4 mr-2" />
              External URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-4">
            {/* File Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging 
                  ? 'border-primary bg-primary/5' 
                  : file 
                    ? 'border-green-500 bg-green-50 dark:bg-green-950/20' 
                    : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="h-8 w-8 text-green-600" />
                  <div className="text-left">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div>
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-2">
                    Drag and drop a file here, or click to select
                  </p>
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.json,.xml,.jpg,.jpeg,.png,.gif,.webp,.svg,.mp4,.webm,.mp3,.wav,.zip"
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    Select File
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Max file size: 50MB
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="url" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">Document URL *</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com/document.pdf"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="format">File Format</Label>
              <SearchableSelect
                options={formatOptions}
                value={format}
                onValueChange={setFormat}
                placeholder="Auto-detected or select..."
                searchPlaceholder="Search formats..."
              />
              {format && (
                <p className="text-xs text-muted-foreground">
                  Detected: {FILE_FORMATS[format] || format}
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Common Fields */}
        <div className="space-y-4 mt-6 pt-6 border-t">
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
                {uploadMode === 'upload' ? 'Uploading...' : 'Adding...'}
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add to Library
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
