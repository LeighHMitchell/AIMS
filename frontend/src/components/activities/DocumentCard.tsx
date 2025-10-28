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
  Edit,
  Copy,
  ExternalLink,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
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
  toIatiXml,
  toIatiJson,
  copyToClipboard,
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
  const [copyFeedback, setCopyFeedback] = React.useState<'xml' | 'json' | null>(null);
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
  
  const handleCopyXml = async () => {
    const xml = toIatiXml(document);
    const success = await copyToClipboard(xml);
    if (success) {
      setCopyFeedback('xml');
      setTimeout(() => setCopyFeedback(null), 2000);
    }
  };
  
  const handleCopyJson = async () => {
    const json = JSON.stringify(toIatiJson(document), null, 2);
    const success = await copyToClipboard(json);
    if (success) {
      setCopyFeedback('json');
      setTimeout(() => setCopyFeedback(null), 2000);
    }
  };
  
  const handleOpen = () => {
    window.open(document.url, '_blank', 'noopener,noreferrer');
  };
  
  return (
    <Card className="group relative overflow-hidden rounded-2xl shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
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
                <h3 className="font-medium text-gray-900 truncate">
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
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge variant="secondary" className="text-xs">
                {getFormatLabel(document.format)}
              </Badge>
              
              {category && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="outline" className="text-xs">
                        {category.name}
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
              )}
              
              {document.languageCodes && document.languageCodes.length > 0 && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Languages className="w-3 h-3" />
                  {getLanguageNames(document.languageCodes).join(', ')}
                </Badge>
              )}
              
              {document.documentDate && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(document.documentDate), 'MMM d, yyyy')}
                </Badge>
              )}
              
              {(document.recipientCountries?.length || document.recipientRegion) && (
                <Badge variant="outline" className="text-xs gap-1">
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
              <Edit className="w-3 h-3" />
              Edit
            </Button>
          )}
          
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopyXml}
            disabled={!validation.ok}
            className="text-xs gap-1"
          >
            <Copy className="w-3 h-3" />
            {copyFeedback === 'xml' ? 'Copied!' : 'XML'}
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopyJson}
            className="text-xs gap-1"
          >
            <Copy className="w-3 h-3" />
            {copyFeedback === 'json' ? 'Copied!' : 'JSON'}
          </Button>
          
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
              <Trash2 className="w-3 h-3" />
              Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
