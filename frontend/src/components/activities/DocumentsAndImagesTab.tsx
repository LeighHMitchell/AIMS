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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { DocumentCard } from './DocumentCard';
import { DocumentForm } from './DocumentForm';
import {
  IatiDocumentLink,
  DOCUMENT_CATEGORIES,
  COMMON_LANGUAGES,
  inferMimeFromUrl,
  validateIatiDocument,
} from '@/lib/iatiDocumentLink';

interface DocumentsAndImagesTabProps {
  documents: IatiDocumentLink[];
  onChange: (documents: IatiDocumentLink[]) => void;
  locale?: string;
  fetchHead?: (url: string) => Promise<{ format?: string; size?: number } | null>;
  customCategories?: typeof DOCUMENT_CATEGORIES;
  customFormats?: Record<string, string>;
  customLanguages?: typeof COMMON_LANGUAGES;
}

export function DocumentsAndImagesTab({
  documents = [],
  onChange,
  locale = 'en',
  fetchHead,
  customCategories,
  customFormats,
  customLanguages,
}: DocumentsAndImagesTabProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterCategory, setFilterCategory] = React.useState<string>('all');
  const [filterLanguage, setFilterLanguage] = React.useState<string>('all');
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingDocument, setEditingDocument] = React.useState<IatiDocumentLink | null>(null);
  const [isBulkImportOpen, setIsBulkImportOpen] = React.useState(false);
  const [bulkUrls, setBulkUrls] = React.useState('');
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  
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
  
  const handleAddDocument = () => {
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
  
  const handleBulkImport = () => {
    const urls = bulkUrls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0 && url.startsWith('https://'));
    
    const newDocs: IatiDocumentLink[] = [];
    const duplicates: string[] = [];
    
    urls.forEach(url => {
      // Skip duplicates
      if (documents.some(d => d.url === url) || newDocs.some(d => d.url === url)) {
        duplicates.push(url);
        return;
      }
      
      // Infer MIME type
      const format = inferMimeFromUrl(url) || 'application/octet-stream';
      
      // Extract filename for title
      const urlObj = new URL(url);
      const filename = urlObj.pathname.split('/').pop() || 'Document';
      
      newDocs.push({
        url,
        format,
        title: [{ text: filename, lang: locale }],
        isImage: format.startsWith('image/'),
      });
    });
    
    if (newDocs.length > 0) {
      onChange([...documents, ...newDocs]);
      toast.success('Bulk import complete', {
        description: `Imported ${newDocs.length} documents${duplicates.length > 0 ? ` (${duplicates.length} duplicates skipped)` : ''}.`,
      });
    }
    
    setIsBulkImportOpen(false);
    setBulkUrls('');
  };
  
  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) return;
    
    const reordered = [...documents];
    const [draggedDoc] = reordered.splice(draggedIndex, 1);
    reordered.splice(dropIndex, 0, draggedDoc);
    
    onChange(reordered);
    setDraggedIndex(null);
  };
  
  const handleDragEnd = () => {
    setDraggedIndex(null);
  };
  
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 flex-1">
          <Button onClick={handleAddDocument} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Link
          </Button>
          <Button variant="outline" onClick={() => setIsBulkImportOpen(true)} className="gap-2">
            <Upload className="w-4 h-4" />
            Bulk Import
          </Button>
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
      
      {/* Document List */}
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-12">
          {documents.length === 0 ? (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <FileImage className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                No documents yet
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Add your first document or image to get started
              </p>
              <Button onClick={handleAddDocument} className="gap-2">
                <Plus className="w-4 h-4" />
                Add your first document or image
              </Button>
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
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
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
      
      {/* Document Form */}
      <DocumentForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        document={editingDocument}
        onSave={handleSaveDocument}
        fetchHead={fetchHead}
        locale={locale}
      />
      
      {/* Bulk Import Dialog */}
      <Dialog open={isBulkImportOpen} onOpenChange={setIsBulkImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Import Documents</DialogTitle>
            <DialogDescription>
              Paste URLs (one per line) to quickly import multiple documents.
              HTTPS URLs only. File formats will be auto-detected.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Textarea
              value={bulkUrls}
              onChange={(e) => setBulkUrls(e.target.value)}
              placeholder="https://example.org/document1.pdf
https://example.org/report.docx
https://example.org/image.jpg"
              rows={10}
              className="font-mono text-sm"
            />
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsBulkImportOpen(false);
                  setBulkUrls('');
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleBulkImport}>
                Import Documents
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
