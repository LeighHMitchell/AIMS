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
import { DocumentCard } from './DocumentCard';
import { DocumentFormEnhanced } from './DocumentFormEnhanced';
import {
  IatiDocumentLink,
  DOCUMENT_CATEGORIES,
  COMMON_LANGUAGES,
  inferMimeFromUrl,
  validateIatiDocument,
  isImageMime,
} from '@/lib/iatiDocumentLink';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface DocumentsAndImagesTabV2Props {
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
}: DocumentsAndImagesTabV2Props) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterCategory, setFilterCategory] = React.useState<string>('all');
  const [filterLanguage, setFilterLanguage] = React.useState<string>('all');
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingDocument, setEditingDocument] = React.useState<IatiDocumentLink | null>(null);
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [uploadingFiles, setUploadingFiles] = React.useState<UploadingFile[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const categories = customCategories || DOCUMENT_CATEGORIES;
  const languages = customLanguages || COMMON_LANGUAGES;
  
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
      
      // Category filter
      if (filterCategory !== 'all' && doc.categoryCode !== filterCategory) {
        return false;
      }
      
      // Language filter
      if (filterLanguage !== 'all' && !doc.languageCodes?.includes(filterLanguage)) {
        return false;
      }
      
      return true;
    });
  }, [documents, searchQuery, filterCategory, filterLanguage]);
  
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
        <div className="flex items-center">
          <Badge
            variant={validationStatus.hasIssues ? 'destructive' : 'default'}
            className="gap-1"
          >
            {validationStatus.hasIssues ? (
              <>
                <AlertCircle className="w-3 h-3" />
                {validationStatus.issueCount} Issues
              </>
            ) : (
              <>
                <CheckCircle className="w-3 h-3" />
                All Valid
              </>
            )}
          </Badge>
        </div>
      </div>

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

      {/* Search and Filter Section */}
      {documents.length > 0 && (
        <div className="bg-white border rounded-lg p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
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
            
            <div className="flex gap-3">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.code} value={cat.code}>
                    {cat.code}
                  </SelectItem>
                ))}
                </SelectContent>
              </Select>
              
              <Select value={filterLanguage} onValueChange={setFilterLanguage}>
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Lang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {languages.map(lang => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.code}
                    </SelectItem>
                  ))}
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
      ) : (
        <>
          {/* Separate uploaded files and linked documents */}
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
                    <div className="grid gap-3">
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
                    <div className="grid gap-3">
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
      />
    </div>
  );
}
