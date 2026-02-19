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
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  const [filterDateRange, setFilterDateRange] = React.useState<string>('all');
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingDocument, setEditingDocument] = React.useState<IatiDocumentLink | null>(null);
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [uploadingFiles, setUploadingFiles] = React.useState<UploadingFile[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage] = React.useState(10);
  
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

      // Date range filter
      if (filterDateRange !== 'all' && doc.documentDate) {
        const docDate = new Date(doc.documentDate);
        const now = new Date();
        const diffMs = now.getTime() - docDate.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        switch (filterDateRange) {
          case 'week':
            if (diffDays > 7) return false;
            break;
          case 'month':
            if (diffDays > 30) return false;
            break;
          case '3months':
            if (diffDays > 90) return false;
            break;
          case '6months':
            if (diffDays > 180) return false;
            break;
          case 'year':
            if (diffDays > 365) return false;
            break;
        }
      }

      return true;
    });
  }, [documents, searchQuery, filterCategory, filterDateRange]);

  // Pagination logic
  const totalPages = React.useMemo(
    () => Math.ceil(filteredDocuments.length / itemsPerPage),
    [filteredDocuments.length, itemsPerPage]
  );

  // Ensure currentPage is within bounds
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    } else if (currentPage < 1) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  // Get paginated documents
  const paginatedDocuments = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredDocuments.slice(startIndex, endIndex);
  }, [filteredDocuments, currentPage, itemsPerPage]);

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

              <Select value={filterDateRange} onValueChange={setFilterDateRange}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="3months">Last 3 Months</SelectItem>
                  <SelectItem value="6months">Last 6 Months</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                </SelectContent>
              </Select>
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
              <h3 className="text-xl font-medium mb-2 text-gray-900">No documents uploaded</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                There are no documents uploaded for this activity.
              </p>

            </div>
          ) : (
            <>
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">No documents match your filters</p>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Table View */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-medium w-[300px]">Title</TableHead>
                  <TableHead className="font-medium">Description</TableHead>
                  <TableHead className="font-medium w-[200px]">Category</TableHead>
                  <TableHead className="font-medium w-[100px]">Format</TableHead>
                  <TableHead className="font-medium w-[120px]">Language</TableHead>
                  <TableHead className="font-medium w-[120px]">Date</TableHead>
                  <TableHead className="font-medium w-[100px]">Type</TableHead>
                  <TableHead className="font-medium text-right w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDocuments.map((doc, index) => {
                  const primaryTitle = getPrimaryTitle(doc);
                  const primaryDescription = getPrimaryDescription(doc);
                  const categoryNames = getCategoryNames(doc);
                  const languageNames = getLanguageNames(doc);
                  const isUploaded = isDocumentUploaded(doc);
                  
                  return (
                    <TableRow
                      key={doc.url}
                    >
                      <TableCell className="font-medium">
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
                          <span>{primaryTitle.text}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {primaryDescription?.text || '-'}
                        </span>
                      </TableCell>
                      <TableCell>{categoryNames || '-'}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="text-xs"
                          style={
                            getFormatLabel(doc.format) === 'HTML'
                              ? { backgroundColor: '#0000FF', color: 'white', borderColor: '#0000FF' }
                              : getFormatLabel(doc.format) === 'PDF'
                              ? { backgroundColor: '#FA0F00', color: 'white', borderColor: '#FA0F00' }
                              : undefined
                          }
                        >
                          {getFormatLabel(doc.format)}
                        </Badge>
                      </TableCell>
                      <TableCell>{languageNames || '-'}</TableCell>
                      <TableCell>
                        {doc.documentDate ? format(new Date(doc.documentDate), 'MMM d, yyyy') : '-'}
                      </TableCell>
                      <TableCell>
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
                      <TableCell className="text-right">
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
                                <Pencil className="w-4 h-4 text-slate-500 ring-1 ring-slate-300 rounded-sm" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteDocument(doc.url)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
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

          {/* Pagination Controls */}
          {filteredDocuments.length > itemsPerPage && (
            <div className="flex items-center justify-between mt-4 px-2">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredDocuments.length)} of {filteredDocuments.length} documents
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  Last
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
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
