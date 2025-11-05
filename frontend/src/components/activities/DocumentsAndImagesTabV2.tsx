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
  LayoutGrid,
  Table as TableIcon,
  Edit,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { DocumentCard } from './DocumentCard';
import { DocumentFormEnhanced } from './DocumentFormEnhanced';
import {
  IatiDocumentLink,
  DOCUMENT_CATEGORIES,
  COMMON_LANGUAGES,
  inferMimeFromUrl,
  validateIatiDocument,
  isImageMime,
  getFormatLabel,
} from '@/lib/iatiDocumentLink';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { EnhancedSearchableSelect, EnhancedSelectGroup } from '@/components/ui/enhanced-searchable-select';

interface DocumentsAndImagesTabV2Props {
  documents: IatiDocumentLink[];
  onChange: (documents: IatiDocumentLink[]) => void;
  activityId?: string;
  locale?: string;
  fetchHead?: (url: string) => Promise<{ format?: string; size?: number } | null>;
  customCategories?: typeof DOCUMENT_CATEGORIES;
  customFormats?: Record<string, string>;
  customLanguages?: typeof COMMON_LANGUAGES;
  readOnly?: boolean;
}

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}

export function DocumentsAndImagesTabV2({
  documents = [],
  onChange,
  activityId,
  locale = 'en',
  fetchHead,
  customCategories,
  customFormats,
  customLanguages,
  readOnly = false,
}: DocumentsAndImagesTabV2Props) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterCategory, setFilterCategory] = React.useState<string>('all');
  const [viewMode, setViewMode] = React.useState<'cards' | 'table'>('cards');
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingDocument, setEditingDocument] = React.useState<IatiDocumentLink | null>(null);
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [uploadingFiles, setUploadingFiles] = React.useState<UploadingFile[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const categories = customCategories || DOCUMENT_CATEGORIES;
  const languages = customLanguages || COMMON_LANGUAGES;

  // Group document categories by Activity Level (A) and Organisation Level (B)
  const categoryGroups: EnhancedSelectGroup[] = React.useMemo(() => {
    const activityLevel = categories.filter(cat => cat.code.startsWith('A'));
    const organisationLevel = categories.filter(cat => cat.code.startsWith('B'));
    
    return [
      {
        label: 'Activity Level',
        options: activityLevel.map(cat => ({
          code: cat.code,
          name: cat.name,
          description: cat.description,
        })),
      },
      {
        label: 'Organisation Level',
        options: organisationLevel.map(cat => ({
          code: cat.code,
          name: cat.name,
          description: cat.description,
        })),
      },
    ];
  }, [categories]);

  // Handle category filter change - allow clearing to show "All"
  const handleCategoryChange = (value: string) => {
    setFilterCategory(value || 'all');
  };
  
  // Filter documents
  const filteredDocuments = React.useMemo(() => {
    return documents.filter(doc => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = doc.title.some(n => 
          n.text.toLowerCase().includes(query)
        );
        const matchesDescription = doc.description?.some(n => 
          n.text.toLowerCase().includes(query)
        );
        const matchesUrl = doc.url.toLowerCase().includes(query);
        
        if (!matchesTitle && !matchesDescription && !matchesUrl) {
          return false;
        }
      }
      
      // Category filter - check if any category matches
      if (filterCategory !== 'all') {
        const docCategories = doc.categoryCodes && doc.categoryCodes.length > 0
          ? doc.categoryCodes
          : (doc.categoryCode ? [doc.categoryCode] : []);
        
        if (!docCategories.includes(filterCategory)) {
          return false;
        }
      }
      
      return true;
    });
  }, [documents, searchQuery, filterCategory]);
  
  // Validation status
  const validationStatus = React.useMemo(() => {
    const issues = documents.flatMap(doc => {
      const validation = validateIatiDocument(doc);
      return validation.issues;
    });
    
    return {
      hasIssues: issues.length > 0,
      issueCount: issues.length,
    };
  }, [documents]);
  
  const handleAddUrl = () => {
    setEditingDocument(null);
    setIsFormOpen(true);
  };
  
  const handleEditDocument = (document: IatiDocumentLink) => {
    setEditingDocument(document);
    setIsFormOpen(true);
  };
  
  const handleSaveDocument = (document: IatiDocumentLink) => {
    const existingIndex = documents.findIndex(d => d.url === editingDocument?.url);
    
    if (existingIndex >= 0) {
      // Update existing
      const updated = [...documents];
      updated[existingIndex] = document;
      onChange(updated);
      toast.success('Document updated', {
        description: 'The document link has been updated successfully.',
      });
    } else {
      // Check for duplicates
      if (documents.some(d => d.url === document.url)) {
        toast.error('Duplicate URL', {
          description: 'A document with this URL already exists.',
        });
        return;
      }
      
      // Add new
      onChange([...documents, document]);
      toast.success('Document added', {
        description: 'The document link has been added successfully.',
      });
    }
  };
  
  const handleDeleteDocument = (url: string) => {
    onChange(documents.filter(d => d.url !== url));
    toast.success('Document removed', {
      description: 'The document link has been removed.',
    });
  };
  
  // File upload handling
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
      
      const response = await fetch(`/api/activities/${activityId}/documents/upload`, {
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
      
      // The new API returns the document in IATI format already
      const newDocument: IatiDocumentLink = data.document || {
        url: data.url,
        format: data.mimeType || file.type || 'application/octet-stream',
        title: [{ text: file.name, lang: locale }],
        description: [{ text: '', lang: locale }],
        categoryCode: 'A01',
        languageCodes: ['en'],
        recipientCountries: [],
        documentDate: new Date().toISOString().split('T')[0],
        isImage: isImageMime(data.mimeType || file.type),
        thumbnailUrl: data.thumbnailUrl,
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
        f.id === uploadId ? { 
          ...f, 
          status: 'error', 
          error: 'Upload failed' 
        } : f
      ));
      
      toast.error('Upload failed', {
        description: `Failed to upload ${file.name}. Please try again.`,
      });
    }
  };
  
  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    Array.from(files).forEach(file => {
      const uploadId = `${Date.now()}-${Math.random()}`;
      const uploadingFile: UploadingFile = {
        id: uploadId,
        file,
        progress: 0,
        status: 'uploading',
      };
      
      setUploadingFiles(prev => [...prev, uploadingFile]);
      uploadFile(file, uploadId);
    });
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
      const currentOrigin = window.location.origin;
      return url.origin === currentOrigin;
    } catch {
      return false;
    }
  };

  // Helper function to get primary title
  const getPrimaryTitle = (doc: IatiDocumentLink) => {
    return doc.title.find(n => n.lang === locale) || doc.title[0];
  };

  // Helper function to get primary description
  const getPrimaryDescription = (doc: IatiDocumentLink) => {
    return doc.description?.find(n => n.lang === locale) || doc.description?.[0];
  };

  // Helper function to get category names
  const getCategoryNames = (doc: IatiDocumentLink) => {
    const categoryCodes = doc.categoryCodes && doc.categoryCodes.length > 0
      ? doc.categoryCodes
      : (doc.categoryCode ? [doc.categoryCode] : []);
    return categoryCodes.map(code => {
      const category = categories.find(c => c.code === code);
      return category ? category.name : code;
    }).join(', ');
  };

  // Helper function to get language names
  const getLanguageNames = (doc: IatiDocumentLink) => {
    if (!doc.languageCodes || doc.languageCodes.length === 0) return '';
    return doc.languageCodes.map(code => {
      const lang = languages.find(l => l.code === code);
      return lang ? lang.name : code.toUpperCase();
    }).join(', ');
  };

  // Helper function to handle document open
  const handleOpenDocument = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };
  
  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Documents & Images</h3>
          <p className="text-sm text-gray-600 mt-1">
            Upload files or link to external documents
          </p>
        </div>
        {!readOnly && validationStatus.hasIssues && (
          <div className="flex items-center">
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="w-3 h-3" />
              {validationStatus.issueCount} Issues
            </Badge>
          </div>
        )}
      </div>

      {/* Add Documents Section */}
      {!readOnly && (
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
      )}

      {/* Search and Filter Section */}
      {documents.length > 0 && (
        <div className="bg-white border rounded-lg p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search documents..."
                  className="pl-9"
                />
              </div>
            </div>
            
            <div className="flex gap-3 items-center">
              <div className="w-[512px]">
                <EnhancedSearchableSelect
                  groups={categoryGroups}
                  value={filterCategory === 'all' ? '' : filterCategory}
                  onValueChange={handleCategoryChange}
                  placeholder="All Categories"
                  searchPlaceholder="Search categories..."
                  dropdownId="document-category-filter"
                  className="pb-0"
                />
              </div>
              
              {/* View Toggle */}
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                  className="rounded-r-none"
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="rounded-l-none"
                >
                  <TableIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map(upload => (
            <div key={upload.id} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium truncate flex-1">
                  {upload.file.name}
                </span>
                {upload.status === 'error' && (
                  <span className="text-xs text-red-600">{upload.error}</span>
                )}
              </div>
              <Progress value={upload.progress} className="h-2" />
            </div>
          ))}
        </div>
      )}
      
      {/* Drop Zone Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-black/20 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-2xl shadow-2xl p-12 flex flex-col items-center gap-4">
            <FileUp className="w-16 h-16 text-blue-500" />
            <p className="text-xl font-semibold">Drop files to upload</p>
            <p className="text-sm text-gray-500">Images and documents supported</p>
          </div>
        </div>
      )}
      
      {/* Document List or Empty State */}
      {filteredDocuments.length === 0 ? (
        <div 
          className={cn(
            "text-center py-12 border-2 border-dashed rounded-lg transition-colors",
            isDragging ? "border-blue-400 bg-blue-50" : "border-gray-200"
          )}
        >
          {documents.length === 0 ? (
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
          ) : (
            <>
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">No documents match your filters</p>
            </>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        <>
          {/* Card View */}
          {(() => {
            const uploadedDocs = filteredDocuments.filter(doc => isDocumentUploaded(doc));
            const linkedDocs = filteredDocuments.filter(doc => !isDocumentUploaded(doc));
            
            return (
              <div className="space-y-6">
                {uploadedDocs.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Cloud className="w-5 h-5 text-gray-600" />
                      <h4 className="font-medium text-gray-900">Uploaded Files ({uploadedDocs.length})</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {uploadedDocs.map((doc, index) => (
                        <div
                          key={doc.url}
                          className="bg-green-50 border border-green-200 rounded-lg p-2"
                        >
                          <DocumentCard
                            document={doc}
                            onEdit={() => handleEditDocument(doc)}
                            onDelete={() => handleDeleteDocument(doc.url)}
                            locale={locale}
                            readOnly={readOnly}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {linkedDocs.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <ExternalLink className="w-5 h-5 text-gray-600" />
                      <h4 className="font-medium text-gray-900">Linked Documents ({linkedDocs.length})</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {linkedDocs.map((doc, index) => (
                        <div
                          key={doc.url}
                          className="bg-white border border-gray-200 rounded-lg p-2"
                        >
                          <DocumentCard
                            document={doc}
                            onEdit={() => handleEditDocument(doc)}
                            onDelete={() => handleDeleteDocument(doc.url)}
                            locale={locale}
                            readOnly={readOnly}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </>
      ) : (
        <>
          {/* Table View */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50 border-b border-border">
                <TableRow>
                  <TableHead className={cn("h-12 px-4 py-3 text-left align-middle text-sm font-medium text-muted-foreground w-[300px]")}>Title</TableHead>
                  <TableHead className={cn("h-12 px-4 py-3 text-left align-middle text-sm font-medium text-muted-foreground")}>Description</TableHead>
                  <TableHead className={cn("h-12 px-4 py-3 text-left align-middle text-sm font-medium text-muted-foreground w-[200px]")}>Category</TableHead>
                  <TableHead className={cn("h-12 px-4 py-3 text-left align-middle text-sm font-medium text-muted-foreground w-[100px]")}>Format</TableHead>
                  <TableHead className={cn("h-12 px-4 py-3 text-left align-middle text-sm font-medium text-muted-foreground w-[120px]")}>Language</TableHead>
                  <TableHead className={cn("h-12 px-4 py-3 text-left align-middle text-sm font-medium text-muted-foreground w-[120px]")}>Date</TableHead>
                  <TableHead className={cn("h-12 px-4 py-3 text-left align-middle text-sm font-medium text-muted-foreground w-[100px]")}>Type</TableHead>
                  <TableHead className={cn("h-12 px-4 py-3 text-right align-middle text-sm font-medium text-muted-foreground w-[120px]")}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc, index) => {
                  const primaryTitle = getPrimaryTitle(doc);
                  const primaryDescription = getPrimaryDescription(doc);
                  const categoryNames = getCategoryNames(doc);
                  const languageNames = getLanguageNames(doc);
                  const isUploaded = isDocumentUploaded(doc);
                  
                  return (
                    <TableRow 
                      key={doc.url}
                      className={cn(
                        "hover:bg-muted/10 transition-colors",
                        index % 2 === 1 && "bg-muted/5"
                      )}
                    >
                      <TableCell className={cn("px-4 py-3 text-sm font-normal text-foreground font-medium")}>
                        <div className="flex items-start gap-3">
                          {(isImageMime(doc.format) || doc.thumbnailUrl) ? (
                            <div className="w-10 h-10 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                              <img
                                src={doc.thumbnailUrl || doc.url}
                                alt={primaryTitle.text}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <FileText className="w-5 h-5 text-gray-500" />
                            </div>
                          )}
                          <span className="text-left">{primaryTitle.text}</span>
                        </div>
                      </TableCell>
                      <TableCell className={cn("px-4 py-3 text-sm font-normal text-foreground")}>
                        <span className="text-sm text-gray-600 text-left">
                          {primaryDescription?.text || '-'}
                        </span>
                      </TableCell>
                      <TableCell className={cn("px-4 py-3 text-sm font-normal text-foreground")}>
                        <span className="text-sm text-left">{categoryNames || '-'}</span>
                      </TableCell>
                      <TableCell className={cn("px-4 py-3 text-sm font-normal text-foreground")}>
                        <Badge variant="secondary" className="text-xs">
                          {getFormatLabel(doc.format)}
                        </Badge>
                      </TableCell>
                      <TableCell className={cn("px-4 py-3 text-sm font-normal text-foreground")}>
                        <span className="text-sm text-left">{languageNames || '-'}</span>
                      </TableCell>
                      <TableCell className={cn("px-4 py-3 text-sm font-normal text-foreground")}>
                        <span className="text-sm text-left">
                          {doc.documentDate ? format(new Date(doc.documentDate), 'MMM d, yyyy') : '-'}
                        </span>
                      </TableCell>
                      <TableCell className={cn("px-4 py-3 text-sm font-normal text-foreground")}>
                        <Badge variant={isUploaded ? 'default' : 'outline'} className="text-xs">
                          {isUploaded ? (
                            <>
                              <Cloud className="w-3 h-3 mr-1 inline" />
                              Uploaded
                            </>
                          ) : (
                            <>
                              <ExternalLink className="w-3 h-3 mr-1 inline" />
                              Linked
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className={cn("px-4 py-3 text-sm font-normal text-foreground text-right")}>
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenDocument(doc.url)}
                            className="h-8 w-8 p-0"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          {!readOnly && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditDocument(doc)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteDocument(doc.url)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
      
      {/* Document Form Modal */}
      <DocumentFormEnhanced
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        document={editingDocument}
        onSave={handleSaveDocument}
        fetchHead={fetchHead}
        locale={locale}
        isUploaded={editingDocument ? isDocumentUploaded(editingDocument) : false}
        activityId={activityId}
      />
    </div>
  );
}
