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
  Cloud,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Edit,
  Trash2,
  Download,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DocumentFormatSelect } from '@/components/forms/DocumentFormatSelect';
import { DocumentCategorySelect } from '@/components/forms/DocumentCategorySelect';
import { DocumentLanguagesSelect } from '@/components/forms/DocumentLanguagesSelect';
import { RecipientCountriesSelect } from '@/components/forms/RecipientCountriesSelect';
import { RecipientCountriesMultiSelect } from '@/components/forms/RecipientCountriesMultiSelect';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiFetch } from '@/lib/api-fetch';

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

interface DocumentMetadataModalProps {
  document: IatiDocumentLink;
  isOpen: boolean;
  onSave: (document: IatiDocumentLink) => void;
  onCancel: () => void;
  locale?: string;
  isEditing?: boolean;
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
  
  // Load documents from new backend on mount
  React.useEffect(() => {
    const loadDocuments = async () => {
      if (!activityId) return;
      
      try {
        console.log('[DocumentsTab] Loading documents for activity:', activityId);
        const response = await apiFetch(`/api/activities/${activityId}/documents`);
        if (response.ok) {
          const data = await response.json();
          console.log('[DocumentsTab] Loaded documents:', data);
          // Always update with backend data (it's the source of truth)
          onChange(data.documents || []);
        } else {
          console.error('[DocumentsTab] Failed to load documents:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('[DocumentsTab] Failed to load documents from backend:', error);
      }
    };
    
    loadDocuments();
  }, [activityId]); // Only depend on activityId to avoid infinite loops
  
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterFormat, setFilterFormat] = React.useState<string>('all');
  const [filterCategory, setFilterCategory] = React.useState<string>('all');
  const [uploadingFiles, setUploadingFiles] = React.useState<UploadingFile[]>([]);
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [pendingUploadedDocument, setPendingUploadedDocument] = React.useState<IatiDocumentLink | null>(null);
  const [showMetadataModal, setShowMetadataModal] = React.useState(false);
  const [editingDocument, setEditingDocument] = React.useState<IatiDocumentLink | null>(null);
  
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
      languageCodes: ['en'], // Default to English
      recipientCountries: ['MM'], // Default to Myanmar
    };
    setNewDocument(newDoc);
  };
  
  const handleSaveNewDocument = (document: IatiDocumentLink) => {
    onChange([...documents, document]);
    setNewDocument(null);
    toast.success('Document added successfully');
  };
  
  const handleSaveUploadedDocument = async (document: IatiDocumentLink) => {
    try {
      console.log('[DocumentsTab] Saving document (skipping database update - already saved during upload)');
      console.log('[DocumentsTab] Document:', document);
      
      // The document is already in the parent state, just update it with new metadata
      const updatedDocuments = documents.map(doc => 
        doc.url === document.url ? document : doc
      );
      onChange(updatedDocuments);
      setPendingUploadedDocument(null);
      setShowMetadataModal(false);
      toast.success('Document information saved successfully');
    } catch (error) {
      console.error('[DocumentsTab] Failed to save document metadata:', error);
      toast.error('Failed to save document information');
    }
  };
  
  const handleCancelUploadedDocument = () => {
    // Document is already in parent state with minimal metadata, just close modal
    setPendingUploadedDocument(null);
    setShowMetadataModal(false);
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
  
  const handleEditDocument = (document: IatiDocumentLink) => {
    // Check if this is an uploaded document
    if (isDocumentUploaded(document)) {
      // Show modal for uploaded documents
      setEditingDocument(document);
      setShowMetadataModal(true);
    }
    // For external URLs, the inline editing will be handled by DocumentCardInlineFixed
  };
  
  const handleSaveEditedDocument = (document: IatiDocumentLink) => {
    handleSaveDocument(document);
    setEditingDocument(null);
    setShowMetadataModal(false);
  };
  
  const handleCancelEdit = () => {
    setEditingDocument(null);
    setShowMetadataModal(false);
  };
  
  const handleDeleteDocument = (url: string) => {
    onChange(documents.filter(doc => doc.url !== url));
    toast.success('Document deleted successfully');
  };

  const handleDownloadDocument = (doc: IatiDocumentLink) => {
    console.log('Download clicked for document:', doc); // Debug log
    try {
      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = doc.url;
      
      // Extract filename from URL or use title
      let filename = 'document';
      if (doc.url) {
        try {
          const url = new URL(doc.url);
          const pathParts = url.pathname.split('/');
          filename = pathParts[pathParts.length - 1] || 'document';
        } catch {
          // If URL parsing fails, use title or default
          filename = doc.title[0]?.text || 'document';
        }
      } else if (doc.title[0]?.text) {
        filename = doc.title[0].text;
      }
      
      // Add file extension if not present
      if (doc.format && !filename.includes('.')) {
        const extension = doc.format.split('/')[1] || 'bin';
        filename += `.${extension}`;
      }
      
      console.log('Downloading file:', filename); // Debug log
      
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Download started');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download document');
    }
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
    console.log('[DocumentsTab] Starting upload for file:', file.name, 'to activity:', activityId);
    
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
      
      console.log('[DocumentsTab] Making upload request to:', `/api/activities/${activityId}/documents/upload`);
      const response = await apiFetch(`/api/activities/${activityId}/documents/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed:', response.status, errorText);
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('[DocumentsTab] Upload API response:', data);
      console.log('[DocumentsTab] Document from response:', data.document);
      
      // Update to processing
      setUploadingFiles(prev => prev.map(f => 
        f.id === uploadId ? { ...f, progress: 90, status: 'processing' } : f
      ));
      
      // The new API returns the document in IATI format already
      const newDocument: IatiDocumentLink = data.document || {
        url: data.url,
        format: data.mimeType || file.type || 'application/octet-stream',
        title: [{ text: file.name.replace(/\.[^/.]+$/, ''), lang: locale }],
        description: [{ text: '', lang: locale }],
        categoryCode: 'A01',
        languageCodes: ['en'], // Default to English
        recipientCountries: ['MM'], // Default to Myanmar
        documentDate: new Date().toISOString().split('T')[0],
        thumbnailUrl: data.thumbnailUrl,
        // Add the document ID from the API response
        _id: data.document?.id || data.id,
        _fileName: data.fileName || file.name,
        _fileSize: data.fileSize || file.size,
        _isExternal: false,
        _createdAt: new Date().toISOString()
      };
      
      // Complete upload
      setUploadingFiles(prev => prev.map(f => 
        f.id === uploadId ? { ...f, progress: 100, status: 'complete' } : f
      ));
      
      // Remove from uploading list after delay
      setTimeout(() => {
        setUploadingFiles(prev => prev.filter(f => f.id !== uploadId));
      }, 500);
      
      // Add document to parent state immediately for tab completion
      onChange([...documents, newDocument]);
      
      // Show metadata modal for the uploaded document
      setPendingUploadedDocument(newDocument);
      setShowMetadataModal(true);
      
      toast.success('File uploaded', {
        description: `${file.name} has been uploaded. Please complete the document information.`,
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

  // Helper function to determine if a document is uploaded (vs external URL)
  const isDocumentUploaded = (document: IatiDocumentLink) => {
    try {
      const url = new URL(document.url);
      // Check if it's a Supabase Storage URL or local upload
      const currentOrigin = window.location.origin;
      const isSupabaseStorage = url.hostname.includes('supabase.co') && url.pathname.includes('/storage/v1/object/public/activity-documents');
      const isLocalUpload = url.origin === currentOrigin;
      return isSupabaseStorage || isLocalUpload;
    } catch {
      return false;
    }
  };
  
  const [activeSubTab, setActiveSubTab] = React.useState('upload');
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  // Pagination logic
  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDocuments = filteredDocuments.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const resetPagination = () => {
    setCurrentPage(1);
  };

  // Reset pagination when filters change
  React.useEffect(() => {
    resetPagination();
  }, [searchTerm, filterFormat, filterCategory]);

  return (
    <div className="space-y-6">


      {/* Sub-tabs for Upload and Library */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="library">Library</TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload" className="mt-6">
          {/* Add Documents Section */}
          <div className="w-full">
            <div className="mt-4">
              <div 
                className={cn(
                  "bg-gray-50 rounded-lg p-8 border-2 border-dashed cursor-pointer transition-all duration-200 min-h-[300px] flex items-center justify-center",
                  isDragOver ? "border-blue-500 bg-blue-100 scale-[1.02]" : "border-gray-300 hover:border-gray-400 hover:bg-gray-100",
                  !activityId && "opacity-50 cursor-not-allowed"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => activityId && fileInputRef.current?.click()}
              >
                <div className="text-center max-w-md">
                  <div className="mb-6">
                    {isDragOver ? (
                      <FileUp className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-bounce" />
                    ) : (
                      <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    )}
                  </div>
                  <h4 className="text-2xl font-medium text-gray-900 mb-3">
                    {isDragOver ? "Drop your files here" : "Upload Documents & Images"}
                  </h4>
                  <p className="text-gray-600 mb-6 text-lg">
                    Drag and drop files anywhere in this area, or click to browse your computer
                  </p>
                  <Button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (activityId) fileInputRef.current?.click();
                    }}
                    disabled={!activityId}
                    className="gap-2 text-lg px-6 py-3"
                    size="lg"
                  >
                    <Upload className="w-5 h-5" />
                    Choose Files
                  </Button>
                  <p className="text-sm text-gray-500 mt-4">
                    Supports: Images (PNG, JPG, GIF), PDFs, Word docs, Excel files, CSV
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="hidden"
                    accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Uploading Files */}
          {uploadingFiles.length > 0 && (
            <div className="space-y-2 mt-6">
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
                      upload.status === 'success' && "bg-gray-100",
                      upload.status === 'error' && "bg-red-100"
                    )}
                  />
                </div>
              ))}
            </div>
          )}

          {/* New Document Form */}
          {newDocument && (
            <div className="mt-6">
              <DocumentCardInlineFixed
                document={newDocument}
                onSave={handleSaveNewDocument}
                onDelete={handleCancelNewDocument}
                fetchHead={fetchHead}
                locale={locale}
                isNew={true}
              />
            </div>
          )}
        </TabsContent>

        {/* Library Tab */}
        <TabsContent value="library" className="mt-6">
          {/* Search and Filter Section */}
          {documents.length > 0 && (
            <div className="bg-white border rounded-lg p-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="w-[640px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search documents..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 flex-1">
                  <div className="flex-1">
                    <DocumentCategoryFilter
                      value={filterCategory}
                      onValueChange={setFilterCategory}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Documents Table */}
          {documents.length > 0 ? (
            <div className="space-y-6">
              {filteredDocuments.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
                  <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">No matching documents</h3>
                  <p>Try adjusting your search or filters</p>
                </div>
              ) : (
                <>
                  {/* Separate uploaded files and linked documents */}
                  {(() => {
                    const uploadedDocs = filteredDocuments.filter(doc => isDocumentUploaded(doc));
                    const linkedDocs = filteredDocuments.filter(doc => !isDocumentUploaded(doc));
                    
                    return (
                      <>
                        {uploadedDocs.length > 0 && (
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b">
                              <Cloud className="w-5 h-5 text-gray-600" />
                              <h4 className="font-medium text-gray-900">Uploaded Files</h4>
                            </div>
                            
                            {/* Uploaded Files Table */}
                            <div className="bg-white border rounded-lg overflow-hidden">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-12">Type</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Languages</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="w-28">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {uploadedDocs.slice(startIndex, endIndex).map((doc) => (
                                    <TableRow key={doc.url}>
                                      <TableCell>
                                        <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                                          {isImageMime(doc.format) ? (
                                            <FileImage className="w-4 h-4 text-gray-600" />
                                          ) : (
                                            <FileText className="w-4 h-4 text-gray-600" />
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <div className="max-w-xs">
                                          <div className="font-medium text-gray-900 truncate">
                                            {doc.title[0]?.text || 'Untitled Document'}
                                          </div>
                                          {doc.description?.[0]?.text && (
                                            <div className="text-sm text-gray-500 truncate">
                                              {doc.description[0].text}
                                            </div>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        {doc.categoryCode && (
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                              {doc.categoryCode}
                                            </span>
                                            <span className="text-sm">
                                              {DOCUMENT_CATEGORIES.find(cat => cat.code === doc.categoryCode)?.name || doc.categoryCode}
                                            </span>
                                          </div>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        {doc.languageCodes && doc.languageCodes.length > 0 && (
                                          <div className="flex flex-wrap gap-1">
                                            {doc.languageCodes.map(code => (
                                              <span key={code} className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                {code.toUpperCase()}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        {doc.documentDate && (
                                          <span className="text-sm text-gray-600">
                                            {new Date(doc.documentDate).toLocaleDateString()}
                                          </span>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex gap-1">
                                          {/* Download Button - Always visible */}
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleDownloadDocument(doc)}
                                            className="h-7 w-7 p-0 hover:bg-blue-50"
                                            title="Download"
                                          >
                                            <Download className="w-3 h-3 text-blue-600" />
                                          </Button>
                                          
                                          {/* Edit Button */}
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleEditDocument(doc)}
                                            className="h-7 w-7 p-0"
                                            title="Edit"
                                          >
                                            <Edit className="w-3 h-3" />
                                          </Button>
                                          
                                          {/* Delete Button */}
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleDeleteDocument(doc.url)}
                                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                                            title="Delete"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>

                            {/* Pagination for Uploaded Files */}
                            {uploadedDocs.length > itemsPerPage && (
                              <div className="flex items-center justify-between px-2">
                                <div className="text-sm text-gray-700">
                                  Showing {startIndex + 1} to {Math.min(endIndex, uploadedDocs.length)} of {uploadedDocs.length} uploaded files
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(1)}
                                    disabled={currentPage === 1}
                                  >
                                    <ChevronsLeft className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                  >
                                    <ChevronLeft className="h-4 w-4" />
                                  </Button>
                                  <span className="text-sm text-gray-700">
                                    Page {currentPage} of {Math.ceil(uploadedDocs.length / itemsPerPage)}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage >= Math.ceil(uploadedDocs.length / itemsPerPage)}
                                  >
                                    <ChevronRight className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(Math.ceil(uploadedDocs.length / itemsPerPage))}
                                    disabled={currentPage >= Math.ceil(uploadedDocs.length / itemsPerPage)}
                                  >
                                    <ChevronsRight className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {linkedDocs.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 pb-2 border-b">
                              <ExternalLink className="w-5 h-5 text-gray-600" />
                              <h4 className="font-medium text-gray-900">Linked Documents</h4>
                            </div>
                            <div className="space-y-3">
                              {linkedDocs.map((doc, index) => (
                                <div
                                  key={doc.url}
                                  className="bg-white border border-gray-200 rounded-lg p-1"
                                >
                                  <DocumentCardInlineFixed
                                    document={doc}
                                    onSave={handleSaveDocument}
                                    onDelete={handleDeleteDocument}
                                    fetchHead={fetchHead}
                                    locale={locale}
                                    isUploaded={false}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </>
              )}
            </div>
          ) : (
            /* Empty State */
            <div className="text-center py-16 text-gray-500">
              <div className="flex justify-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Cloud className="w-8 h-8 text-gray-400" />
                </div>
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                  <ExternalLink className="w-8 h-8 text-gray-400" />
                </div>
              </div>
              <h3 className="text-xl font-medium mb-2 text-gray-900">No documents yet</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Get started by uploading files from your computer or linking to documents hosted elsewhere
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Document Metadata Modal */}
      {showMetadataModal && (pendingUploadedDocument || editingDocument) && (
        <DocumentMetadataModal
          document={pendingUploadedDocument || editingDocument!}
          isOpen={showMetadataModal}
          onSave={pendingUploadedDocument ? handleSaveUploadedDocument : handleSaveEditedDocument}
          onCancel={pendingUploadedDocument ? handleCancelUploadedDocument : handleCancelEdit}
          locale={locale}
          isEditing={!!editingDocument}
        />
      )}
    </div>
  );
}

// Document Metadata Modal Component
function DocumentMetadataModal({
  document,
  isOpen,
  onSave,
  onCancel,
  locale = 'en',
  isEditing = false
}: DocumentMetadataModalProps) {
  const [formData, setFormData] = React.useState<IatiDocumentLink>(document);
  const [selectedLanguages, setSelectedLanguages] = React.useState<string[]>(
    document.languageCodes || ['en'] // Default to English
  );
  const [selectedCountries, setSelectedCountries] = React.useState<string[]>(
    document.recipientCountries || ['MM'] // Default to Myanmar
  );

  const handleSave = () => {
    const updatedDocument = {
      ...formData,
      languageCodes: selectedLanguages,
      recipientCountries: selectedCountries
    };
    onSave(updatedDocument);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-2xl max-h-[80vh] sm:max-h-[85vh] overflow-hidden flex flex-col mx-4 sm:mx-0">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{isEditing ? 'Edit Document Information' : 'Complete Document Information'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the document information and metadata.'
              : 'Please provide additional details about the uploaded document. This information helps organize and categorize your documents.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1 -mx-1">
          <div className="space-y-4 py-4 px-1">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="doc-title">Document Title <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
            <Input
              id="doc-title"
              value={formData.title[0]?.text || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                title: [{ text: e.target.value, lang: locale }]
              }))}
              placeholder="Enter document title..."
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="doc-description">Description</Label>
            <Textarea
              id="doc-description"
              value={formData.description?.[0]?.text || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                description: [{ text: e.target.value, lang: locale }]
              }))}
              placeholder="Describe the document content..."
              rows={3}
            />
          </div>

          {/* Format */}
          <div className="space-y-2">
            <Label>Document Format <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
            <DocumentFormatSelect
              value={formData.format}
              onValueChange={(value) => setFormData(prev => ({ ...prev, format: value }))}
              placeholder="Select document format..."
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Document Category</Label>
            <DocumentCategorySelect
              value={formData.categoryCode}
              onValueChange={(value) => setFormData(prev => ({ ...prev, categoryCode: value }))}
              placeholder="Select category..."
            />
          </div>

          {/* Languages */}
          <div className="space-y-2">
            <Label>Document Languages</Label>
            <DocumentLanguagesSelect
              value={selectedLanguages}
              onValueChange={(value) => setSelectedLanguages(Array.isArray(value) ? value : [value])}
              placeholder="Select languages..."
              multiple={true}
            />
          </div>

          {/* Recipient Countries */}
          <div className="space-y-2">
            <Label>Recipient Countries</Label>
            <RecipientCountriesMultiSelect
              value={selectedCountries}
              onValueChange={setSelectedCountries}
              placeholder="Select recipient countries..."
            />
          </div>

          {/* Document Date */}
          <div className="space-y-2">
            <Label htmlFor="doc-date">Document Date</Label>
            <Input
              id="doc-date"
              type="date"
              value={formData.documentDate || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, documentDate: e.target.value }))}
            />
          </div>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4">
          <Button variant="outline" onClick={onCancel}>
            {isEditing ? 'Cancel' : 'Skip for Now'}
          </Button>
          <Button onClick={handleSave}>
            {isEditing ? 'Update Document' : 'Save Document Information'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 