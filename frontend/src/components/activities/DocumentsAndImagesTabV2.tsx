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
        title: [{ text: file.name, lang: locale }],
        isImage: isImageMime(data.mimeType || file.type),
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
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    handleFileSelect(files);
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
      className="space-y-4"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
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
        
        <div className="flex gap-2 flex-1 sm:max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="pl-9"
            />
          </div>
          
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
                Valid
              </>
            )}
          </Badge>
        </div>
      </div>
      
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
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <FileImage className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                No documents yet
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Drag and drop files here, or click to add a URL
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={handleAddUrl} className="gap-2">
                  <Link2 className="w-4 h-4" />
                  Add URL
                </Button>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload Files
                </Button>
              </div>
            </>
          ) : (
            <>
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">No documents match your filters</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredDocuments.map((doc, index) => (
            <div
              key={doc.url}
              draggable
              onDragStart={(e) => handleDocumentDragStart(e, index)}
              onDragOver={handleDocumentDragOver}
              onDrop={(e) => handleDocumentDrop(e, index)}
              onDragEnd={handleDocumentDragEnd}
              className={`transition-opacity ${
                draggedIndex === index ? 'opacity-50' : ''
              }`}
            >
              <DocumentCard
                document={doc}
                onEdit={handleEditDocument}
                onDelete={handleDeleteDocument}
                locale={locale}
              />
            </div>
          ))}
        </div>
      )}
      
      {/* Document Form Modal */}
      <DocumentFormEnhanced
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        document={editingDocument}
        onSave={handleSaveDocument}
        fetchHead={fetchHead}
        locale={locale}
      />
    </div>
  );
}
