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
import { Badge } from '@/components/ui/badge';
import { Upload, Link2, X, Plus, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { COMMON_LANGUAGES, inferMimeFromUrl, FILE_FORMATS } from '@/lib/iatiDocumentLink';

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
  const [titleLang, setTitleLang] = useState('en');
  const [description, setDescription] = useState('');
  const [categoryCode, setCategoryCode] = useState('');
  const [documentDate, setDocumentDate] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [languageCodes, setLanguageCodes] = useState<string[]>(['en']);
  const [recipientCountries, setRecipientCountries] = useState<string[]>([]);
  
  // Organizations for select
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string; acronym?: string }>>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);

  // Fetch organizations
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const response = await fetch('/api/organizations');
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
      setTitleLang('en');
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

  // Auto-detect format from file
  useEffect(() => {
    if (file) {
      setFormat(file.type);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
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

  // Remove language
  const handleRemoveLanguage = (code: string) => {
    setLanguageCodes(languageCodes.filter(c => c !== code));
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

      // Add metadata
      formData.append('title', JSON.stringify([{ text: title.trim(), lang: titleLang }]));
      
      if (description.trim()) {
        formData.append('description', JSON.stringify([{ text: description.trim(), lang: titleLang }]));
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

      const response = await fetch('/api/library/upload', {
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
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <div className="flex gap-2">
              <Input
                id="title"
                placeholder="Enter document title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="flex-1"
              />
              <SearchableSelect
                options={languageOptions}
                value={titleLang}
                onValueChange={setTitleLang}
                placeholder="Lang"
                className="w-[120px]"
              />
            </div>
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

          {/* Category */}
          <div className="space-y-2">
            <Label>Document Category (IATI)</Label>
            <DocumentCategorySelect
              value={categoryCode}
              onValueChange={setCategoryCode}
              placeholder="Select category..."
            />
          </div>

          {/* Two-column layout for remaining fields */}
          <div className="grid grid-cols-2 gap-4">
            {/* Document Date */}
            <div className="space-y-2">
              <Label htmlFor="documentDate">Document Date</Label>
              <Input
                id="documentDate"
                type="date"
                value={documentDate}
                onChange={(e) => setDocumentDate(e.target.value)}
              />
            </div>

            {/* Organization */}
            <div className="space-y-2">
              <Label>Associated Organization</Label>
              <SearchableSelect
                options={orgOptions}
                value={organizationId}
                onValueChange={setOrganizationId}
                placeholder="Select organization..."
                searchPlaceholder="Search organizations..."
                loading={loadingOrgs}
              />
            </div>
          </div>

          {/* Document Languages */}
          <div className="space-y-2">
            <Label>Document Languages</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {languageCodes.map(code => {
                const lang = COMMON_LANGUAGES.find(l => l.code === code);
                return (
                  <Badge key={code} variant="secondary" className="gap-1">
                    {lang?.name || code}
                    <button onClick={() => handleRemoveLanguage(code)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
            <div className="flex gap-2">
              <SearchableSelect
                options={languageOptions.filter(l => !languageCodes.includes(l.value))}
                value=""
                onValueChange={(v) => {
                  handleAddLanguage(v);
                }}
                placeholder="Add language..."
                searchPlaceholder="Search languages..."
                className="flex-1"
              />
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
