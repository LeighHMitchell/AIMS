import React from 'react';
import {
  Plus,
  Upload,
  Search,
  Filter,
  FileText,
  CheckCircle,
  AlertCircle,
  FileImage,
  Link2,
  FileUp,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { DocumentCardInlineFixed } from './DocumentCardInlineFixed';
import {
  IatiDocumentLink,
  DOCUMENT_CATEGORIES,
  COMMON_LANGUAGES,
  inferMimeFromUrl,
  validateIatiDocument,
  isImageMime,
} from '@/lib/iatiDocumentLink';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

// Document Type Filter Component
interface DocumentTypeFilterProps {
  value: string;
  onValueChange: (value: string) => void;
}

function DocumentTypeFilter({ value, onValueChange }: DocumentTypeFilterProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  
  const typeOptions = [
    { value: 'all', label: 'All types' },
    { value: 'images', label: 'Images' },
    { value: 'documents', label: 'Documents' },
    { value: 'pdf', label: 'PDFs' },
  ];
  
  const selectedOption = typeOptions.find(option => option.value === value);
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/50 transition-colors"
        )}
      >
        <span className="truncate">
          {selectedOption?.label || 'All types'}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0 shadow-lg border-border" align="start" sideOffset={4}>
        <div className="p-1">
          {typeOptions.map((option) => (
            <button
              key={option.value}
              className={cn(
                "w-full text-left px-2 py-2 rounded-md text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                value === option.value && "bg-blue-100 text-blue-900"
              )}
              onClick={() => {
                onValueChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Document Category Filter Component  
interface DocumentCategoryFilterProps {
  value: string;
  onValueChange: (value: string) => void;
}

function DocumentCategoryFilter({ value, onValueChange }: DocumentCategoryFilterProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  
  const allOptions = [
    { code: 'all', name: 'All categories', description: 'Show all categories' },
    ...DOCUMENT_CATEGORIES
  ];
  
  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return allOptions;
    
    const query = searchQuery.toLowerCase();
    return allOptions.filter(option => 
      option.code.toLowerCase().includes(query) ||
      option.name.toLowerCase().includes(query) ||
      (option.description && option.description.toLowerCase().includes(query))
    );
  }, [searchQuery]);
  
  const selectedOption = allOptions.find(option => option.code === value);
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/50 transition-colors"
        )}
      >
        <span className="truncate">
          {selectedOption ? (
            <span className="flex items-center gap-2">
              {selectedOption.code !== 'all' && (
                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {selectedOption.code}
                </span>
              )}
              <span className="font-medium">{selectedOption.name}</span>
            </span>
          ) : (
            'All categories'
          )}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0 shadow-lg border-border" align="start" sideOffset={4}>
        <div className="border-b border-border p-3">
          <Input
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        <ScrollArea className="h-64">
          <div className="p-1">
            {filteredOptions.map((option) => (
              <button
                key={option.code}
                className={cn(
                  "w-full text-left px-2 py-2 rounded-md text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                  value === option.code && "bg-blue-100 text-blue-900"
                )}
                onClick={() => {
                  onValueChange(option.code);
                  setIsOpen(false);
                  setSearchQuery("");
                }}
              >
                <div className="flex items-center gap-2">
                  {option.code !== 'all' && (
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded min-w-[2.5rem]">
                      {option.code}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{option.name}</div>
                    {option.description && (
                      <div className="text-xs text-muted-foreground truncate">{option.description}</div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

interface DocumentsAndImagesTabInlineProps {
  documents: IatiDocumentLink[];
  onChange: (documents: IatiDocumentLink[]) => void;
  activityId?: string;
  locale?: string;
  fetchHead?: (url: string) => Promise<{ format?: string; size?: number } | null>;
  customCategories?: typeof DOCUMENT_CATEGORIES;
  customFormats?: Record<string, string>;
  customLanguages?: typeof COMMON_LANGUAGES;
}

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'success' | 'error';
}

export function DocumentsAndImagesTabInline({
  documents = [],
  onChange,
  activityId,
  locale = 'en',
  fetchHead,
  customCategories,
  customFormats,
  customLanguages,
}: DocumentsAndImagesTabInlineProps) {
  
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterFormat, setFilterFormat] = React.useState<string>('all');
  const [filterCategory, setFilterCategory] = React.useState<string>('all');
  const [uploadingFiles, setUploadingFiles] = React.useState<UploadingFile[]>([]);
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Track new document being added
  const [newDocument, setNewDocument] = React.useState<IatiDocumentLink | null>(null);
  
  const filteredDocuments = React.useMemo(() => {
    return documents.filter(doc => {
      const title = doc.title[0]?.text.toLowerCase() || '';
      const description = doc.description?.[0]?.text.toLowerCase() || '';
      const matchesSearch = searchTerm === '' || 
        title.includes(searchTerm.toLowerCase()) || 
        description.includes(searchTerm.toLowerCase());
      
      const matchesFormat = filterFormat === 'all' || 
        (filterFormat === 'images' && isImageMime(doc.format)) ||
        (filterFormat === 'documents' && !isImageMime(doc.format)) ||
        doc.format.includes(filterFormat);
      
      const matchesCategory = filterCategory === 'all' || doc.categoryCode === filterCategory;
      
      return matchesSearch && matchesFormat && matchesCategory;
    });
  }, [documents, searchTerm, filterFormat, filterCategory]);
  
  const stats = React.useMemo(() => {
    const total = documents.length;
    const images = documents.filter(doc => isImageMime(doc.format)).length;
    const validated = documents.filter(doc => {
      try {
        return validateIatiDocument(doc).ok;
      } catch {
        return false;
      }
    }).length;
    
    return { total, images, documents: total - images, validated };
  }, [documents]);
  
  const handleAddUrl = () => {
    const newDoc: IatiDocumentLink = {
      url: '',
      format: '',
      title: [{ text: '', lang: locale }],
      description: [],
      languageCodes: ['en'],
      recipientCountries: [],
    };
    setNewDocument(newDoc);
  };
  
  const handleSaveNewDocument = (document: IatiDocumentLink) => {
    onChange([...documents, document]);
    setNewDocument(null);
    toast.success('Document added successfully');
  };
  
  const handleCancelNewDocument = () => {
    setNewDocument(null);
  };
  
  const handleSaveDocument = (updatedDocument: IatiDocumentLink) => {
    const updated = documents.map(doc => 
      doc.url === updatedDocument.url ? updatedDocument : doc
    );
    onChange(updated);
    toast.success('Document updated successfully');
  };
  
  const handleDeleteDocument = (url: string) => {
    onChange(documents.filter(doc => doc.url !== url));
    toast.success('Document deleted successfully');
  };
  
  const handleFileSelect = (files: FileList | null) => {
    if (!files || !activityId) return;
    
    Array.from(files).forEach(file => {
      const uploadId = crypto.randomUUID();
      const newUpload: UploadingFile = {
        id: uploadId,
        file,
        progress: 0,
        status: 'uploading',
      };
      
      setUploadingFiles(prev => [...prev, newUpload]);
      
      // Use real upload function
      uploadFile(file, uploadId);
    });
  };

  // Real file upload function
  const uploadFile = async (file: File, uploadId: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (activityId) {
      formData.append('activityId', activityId);
    }
    
    try {
      // Update progress to show we're uploading
      setUploadingFiles(prev => prev.map(f => 
        f.id === uploadId ? { ...f, progress: 10 } : f
      ));
      
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const data = await response.json();
      
      // Update to processing
      setUploadingFiles(prev => prev.map(f => 
        f.id === uploadId ? { ...f, progress: 90, status: 'processing' } : f
      ));
      
      // Create document with uploaded file info
      const newDocument: IatiDocumentLink = {
        url: `${window.location.origin}${data.url}`,
        format: data.mimeType || file.type || 'application/octet-stream',
        title: [{ text: file.name.replace(/\.[^/.]+$/, ''), lang: locale }],
        description: [],
        languageCodes: ['en'],
        recipientCountries: [],
        documentDate: new Date().toISOString().split('T')[0],
      };
      
      // Add to documents
      onChange([...documents, newDocument]);
      
      // Complete upload
      setUploadingFiles(prev => prev.map(f => 
        f.id === uploadId ? { ...f, progress: 100, status: 'complete' } : f
      ));
      
      // Remove from uploading list after delay
      setTimeout(() => {
        setUploadingFiles(prev => prev.filter(f => f.id !== uploadId));
      }, 1000);
      
      toast.success('File uploaded', {
        description: `${file.name} has been uploaded successfully. Edit it to add more details.`,
      });
      
    } catch (error) {
      console.error('Upload error:', error);
      setUploadingFiles(prev => prev.map(f => 
        f.id === uploadId ? { ...f, status: 'error' } : f
      ));
      toast.error(`Failed to upload ${file.name}`, {
        description: error instanceof Error ? error.message : 'Upload failed',
      });
    }
  };
  

  
  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
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
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };
  
  // Document reordering
  const handleDocumentDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDocumentDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  
  const handleDocumentDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) return;
    
    const reordered = [...documents];
    const [draggedDoc] = reordered.splice(draggedIndex, 1);
    reordered.splice(dropIndex, 0, draggedDoc);
    
    onChange(reordered);
    setDraggedIndex(null);
  };
  
  const handleDocumentDragEnd = () => {
    setDraggedIndex(null);
  };
  
  return (
    <div 
      className={cn(
        "space-y-4 transition-colors duration-200",
        isDragOver && "bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg p-4"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drop Zone Message */}
      {isDragOver && (
        <div className="flex flex-col items-center justify-center py-8 text-blue-600">
          <FileUp className="w-12 h-12 mb-2" />
          <p className="text-lg font-medium">Drop files here to upload</p>
          <p className="text-sm">Supports images, PDFs, and documents</p>
        </div>
      )}
      
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 flex-1">
          <Button onClick={handleAddUrl} className="gap-2">
            <Link2 className="w-4 h-4" />
            Add URL
          </Button>
          <Button 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()} 
            className="gap-2"
            disabled={!activityId}
          >
            <Upload className="w-4 h-4" />
            Upload Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv"
          />
        </div>
        
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="w-48">
            <DocumentTypeFilter
              value={filterFormat}
              onValueChange={setFilterFormat}
            />
          </div>
          
          <div className="w-64">
            <DocumentCategoryFilter
              value={filterCategory}
              onValueChange={setFilterCategory}
            />
          </div>
        </div>
      </div>
      
      {/* Stats */}
      <div className="flex gap-4 text-sm text-gray-600">
        <span className="flex items-center gap-1">
          <FileText className="w-4 h-4" />
          {stats.total} total
        </span>
        <span className="flex items-center gap-1">
          <FileImage className="w-4 h-4" />
          {stats.images} images
        </span>
        <span className="flex items-center gap-1">
          <CheckCircle className="w-4 h-4" />
          {stats.validated} validated
        </span>
        {stats.total > stats.validated && (
          <span className="flex items-center gap-1 text-amber-600">
            <AlertCircle className="w-4 h-4" />
            {stats.total - stats.validated} need attention
          </span>
        )}
      </div>
      
      {/* Uploading Files */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Uploading Files</h4>
          {uploadingFiles.map(upload => (
            <div key={upload.id} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium truncate flex-1">
                  {upload.file.name}
                </span>
                <span className="text-xs text-gray-500 ml-2">
                  {upload.status === 'uploading' && `${Math.round(upload.progress)}%`}
                  {upload.status === 'success' && 'Complete'}
                  {upload.status === 'error' && 'Failed'}
                </span>
              </div>
              <Progress 
                value={upload.progress} 
                className={cn(
                  "h-2",
                  upload.status === 'success' && "bg-green-100",
                  upload.status === 'error' && "bg-red-100"
                )}
              />
            </div>
          ))}
        </div>
      )}
      
      {/* New Document Form */}
      {newDocument && (
        <DocumentCardInlineFixed
          document={newDocument}
          onSave={handleSaveNewDocument}
          onDelete={handleCancelNewDocument}
          fetchHead={fetchHead}
          locale={locale}
          isNew={true}
        />
      )}
      
      {/* Documents List */}
      <div className="space-y-4">
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {documents.length === 0 ? (
              <>
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">No documents yet</h3>
                <p className="mb-4">Add your first document or image to get started</p>
                <Button onClick={handleAddUrl} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Document
                </Button>
              </>
            ) : (
              <>
                <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">No matching documents</h3>
                <p>Try adjusting your search or filters</p>
              </>
            )}
          </div>
        ) : (
          <ScrollArea className="h-auto">
            <div className="space-y-4">
              {filteredDocuments.map((doc, index) => (
                <div
                  key={doc.url}
                  draggable
                  onDragStart={(e) => handleDocumentDragStart(e, index)}
                  onDragOver={handleDocumentDragOver}
                  onDrop={(e) => handleDocumentDrop(e, index)}
                  onDragEnd={handleDocumentDragEnd}
                  className={cn(
                    "transition-opacity duration-200",
                    draggedIndex === index && "opacity-50"
                  )}
                >
                  <DocumentCardInlineFixed
                    document={doc}
                    onSave={handleSaveDocument}
                    onDelete={handleDeleteDocument}
                    fetchHead={fetchHead}
                    locale={locale}
                  />
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
      
      {/* Bulk Actions */}
      {filteredDocuments.length > 0 && (
        <div className="flex justify-between items-center pt-4 border-t">
          <span className="text-sm text-gray-600">
            Showing {filteredDocuments.length} of {documents.length} documents
          </span>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const validDocs = documents.filter(doc => {
                  try {
                    return validateIatiDocument(doc).ok;
                  } catch {
                    return false;
                  }
                });
                const xml = validDocs.map(doc => {
                  try {
                    return `<!-- ${doc.title[0]?.text || 'Untitled'} -->\n<!-- URL: ${doc.url} -->`;
                  } catch {
                    return '<!-- Invalid document -->';
                  }
                }).join('\n\n');
                navigator.clipboard.writeText(xml);
                toast.success('Document URLs copied to clipboard');
              }}
              className="gap-1"
            >
              <X className="w-3 h-3" />
              Copy All URLs
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 