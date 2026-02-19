import React from 'react';
import {
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Globe,
  Calendar,
  Languages,
  MapPin,
  Pencil,
  ExternalLink,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  IatiDocumentLink, 
  DOCUMENT_CATEGORIES, 
  COMMON_LANGUAGES,
  getFormatLabel,
  isImageMime,
  getFaviconUrl,
  validateIatiDocument,
} from '@/lib/iatiDocumentLink';
import { format } from 'date-fns';

interface DocumentCardProps {
  document: IatiDocumentLink;
  onEdit: (document: IatiDocumentLink) => void;
  onDelete: (url: string) => void;
  locale?: string;
  readOnly?: boolean;
}

export function DocumentCard({ 
  document, 
  onEdit, 
  onDelete,
  locale = 'en',
  readOnly = false
}: DocumentCardProps) {
  const validation = React.useMemo(() => {
    try {
      return validateIatiDocument(document);
    } catch (error) {
      console.error('Validation error in DocumentCard:', error);
      return { ok: true, issues: [] };
    }
  }, [document]);
  const isImage = isImageMime(document.format);
  
  // Get primary title in current locale or fallback
  const primaryTitle = document.title.find(n => n.lang === locale) || document.title[0];
  const primaryDescription = document.description?.find(n => n.lang === locale) || document.description?.[0];
  
  // Get category label
  const category = DOCUMENT_CATEGORIES.find(c => c.code === document.categoryCode);
  
  // Get all categories - prefer categoryCodes array, fallback to categoryCode
  const categoryCodes = document.categoryCodes && document.categoryCodes.length > 0
    ? document.categoryCodes
    : (document.categoryCode ? [document.categoryCode] : []);
  
  // Get category labels for all categories
  const categories = categoryCodes.map(code => 
    DOCUMENT_CATEGORIES.find(c => c.code === code)
  ).filter(Boolean);
  
  // Get language names from codes
  const getLanguageNames = (languageCodes: string[]) => {
    return languageCodes.map(code => {
      const lang = COMMON_LANGUAGES.find(l => l.code === code);
      return lang ? lang.name : code.toUpperCase();
    });
  };
  
  // Get file type icon
  const getFileIcon = () => {
    if (isImage) return Image;
    if (document.format.includes('video')) return Video;
    if (document.format.includes('audio')) return Music;
    if (document.format.includes('zip') || document.format.includes('rar')) return Archive;
    return FileText;
  };
  
  const FileIcon = getFileIcon();
  
  
  const handleOpen = () => {
    window.open(document.url, '_blank', 'noopener,noreferrer');
  };
  
  return (
    <div className="group relative">
      <div className="flex gap-4">
          {/* Preview/Icon */}
          <div className="flex-shrink-0">
            {(isImage || document.thumbnailUrl) ? (
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={document.thumbnailUrl || document.url}
                  alt={primaryTitle.text}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = `
                      <div class="w-16 h-16 flex items-center justify-center">
                        <svg class="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    `;
                  }}
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                <FileIcon className="w-8 h-8 text-gray-500" />
              </div>
            )}
          </div>
          
          {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 break-words">
                    {primaryTitle.text}
                  </h3>
                {primaryDescription && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {primaryDescription.text}
                  </p>
                )}
              </div>
              
              {/* Validation indicator */}
              {!validation.ok && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-sm">
                        {validation.issues && validation.issues.length > 0 ? (
                          validation.issues.map((issue, i) => (
                            <div key={i}>{issue.message}</div>
                          ))
                        ) : (
                          <div>Validation error</div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            
            {/* Badges */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              <Badge variant="secondary" className="text-xs rounded px-1.5 py-0.5 border-0">
                {getFormatLabel(document.format)}
              </Badge>
              
              {document.languageCodes && document.languageCodes.length > 0 && (
                <Badge variant="secondary" className="text-xs gap-1 rounded px-1.5 py-0.5 border-0">
                  <Languages className="w-3 h-3" />
                  {getLanguageNames(document.languageCodes).join(', ')}
                </Badge>
              )}
              
              {categories.map((category, idx) => category && (
                <TooltipProvider key={category.code || idx}>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="secondary" className="text-xs rounded px-1.5 py-0.5 border-0">
                        <span className="text-left">{category.name}</span>
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="max-w-xs">
                        <p className="font-medium">{category.name} ({category.code})</p>
                        <p className="text-sm">{category.description}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
              
              {document.documentDate && (
                <Badge variant="secondary" className="text-xs gap-1 rounded px-1.5 py-0.5 border-0">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(document.documentDate), 'MMM d, yyyy')}
                </Badge>
              )}
              
              {(document.recipientCountries?.length || document.recipientRegion) && (
                <Badge variant="secondary" className="text-xs gap-1 rounded px-1.5 py-0.5 border-0">
                  <MapPin className="w-3 h-3" />
                  {document.recipientCountries?.length
                    ? `${document.recipientCountries.length} countries`
                    : 'Region'}
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-1 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
          {!readOnly && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(document)}
              className="text-xs gap-1"
            >
              <Pencil className="w-3 h-3 text-slate-500 ring-1 ring-slate-300 rounded-sm" />
              Edit
            </Button>
          )}
          
          <Button
            size="sm"
            variant="ghost"
            onClick={handleOpen}
            className="text-xs gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            Open
          </Button>
          
          {!readOnly && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(document.url)}
              className="text-xs gap-1 text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-3 h-3 text-red-500" />
              Delete
            </Button>
          )}
        </div>
    </div>
  );
}
