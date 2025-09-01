import React from 'react';
import {
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Edit,
  Copy,
  ExternalLink,
  Trash2,
  AlertCircle,
  Save,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Languages,
  Calendar,
  MapPin,
  Globe,
} from 'lucide-react';
import { DocumentFormatSelect } from '@/components/forms/DocumentFormatSelect';
import { DocumentCategorySelect } from '@/components/forms/DocumentCategorySelect';
import { DocumentLanguagesSelect } from '@/components/forms/DocumentLanguagesSelect';
import { RecipientCountriesSelect } from '@/components/forms/RecipientCountriesSelect';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { 
  IatiDocumentLink, 
  Narrative,
  DOCUMENT_CATEGORIES, 
  COMMON_LANGUAGES,
  getFormatLabel,
  isImageMime,
  toIatiXml,
  toIatiJson,
  copyToClipboard,
  validateIatiDocument,
  inferMimeFromUrl,
} from '@/lib/iatiDocumentLink';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface DocumentCardInlineProps {
  document: IatiDocumentLink;
  onSave: (document: IatiDocumentLink) => void;
  onDelete: (url: string) => void;
  onEdit?: () => void; // New prop for triggering external edit
  fetchHead?: (url: string) => Promise<{ format?: string; size?: number } | null>;
  locale?: string;
  isNew?: boolean;
  isUploaded?: boolean; // New prop to indicate if this is an uploaded file
}

export function DocumentCardInlineFixed({ 
  document, 
  onSave, 
  onDelete,
  onEdit,
  fetchHead,
  locale = 'en',
  isNew = false,
  isUploaded = false
}: DocumentCardInlineProps) {
  const [isEditing, setIsEditing] = React.useState(isNew);
  const [formData, setFormData] = React.useState<IatiDocumentLink>(() => ({
    ...document,
    description: document.description?.length ? document.description : [{ text: '', lang: locale }]
  }));
  const [copyFeedback, setCopyFeedback] = React.useState<'xml' | 'json' | null>(null);
  const [urlMetadata, setUrlMetadata] = React.useState<{
    format?: string;
    size?: number;
    error?: string;
  }>({});
  const [selectedLanguages, setSelectedLanguages] = React.useState<string[]>(
    (document.languageCodes && document.languageCodes.length > 0) ? document.languageCodes : ['en']
  );
  const [selectedCountries, setSelectedCountries] = React.useState<string[]>(
    document.recipientCountries || []
  );
  const [countryInput, setCountryInput] = React.useState('');
  const [showValidation, setShowValidation] = React.useState(false);

  const validation = React.useMemo(() => {
    try {
      const result = validateIatiDocument(formData);
      if (!result.ok) {
        console.log('[DocumentCardInlineFixed] Validation issues for document:', formData.url);
        result.issues.forEach((issue, index) => {
          console.log(`[DocumentCardInlineFixed] Issue ${index + 1}: ${issue.path} - ${issue.message}`);
        });
        console.log('[DocumentCardInlineFixed] Document data:', {
          url: formData.url,
          format: formData.format,
          title: formData.title,
          description: formData.description,
          categoryCode: formData.categoryCode,
          languageCodes: formData.languageCodes,
          documentDate: formData.documentDate,
          recipientCountries: formData.recipientCountries
        });
      }
      return result;
    } catch (error) {
      console.error('Validation error in DocumentCardInlineFixed:', error);
      return { ok: true, issues: [] };
    }
  }, [formData]);

  const isImage = isImageMime(formData.format);
  
  // Get primary title in current locale or fallback
  const primaryTitle = formData.title.find(n => n.lang === locale) || formData.title[0];
  const primaryDescription = formData.description?.find(n => n.lang === locale) || formData.description?.[0];
  
  // Get category label
  const category = DOCUMENT_CATEGORIES.find(c => c.code === formData.categoryCode);
  
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
    if (formData.format.includes('video')) return Video;
    if (formData.format.includes('audio')) return Music;
    if (formData.format.includes('zip') || formData.format.includes('rar')) return Archive;
    return FileText;
  };
  
  const FileIcon = getFileIcon();

  React.useEffect(() => {
    // Ensure new documents have default description structure
    const updatedDocument = { 
      ...document,
      description: document.description?.length ? document.description : [{ text: '', lang: locale }]
    };
    setFormData(updatedDocument);
    setSelectedLanguages(document.languageCodes || []);
    setSelectedCountries(document.recipientCountries || []);
  }, [document, locale]);

  const handleCopyXml = async () => {
    const xml = toIatiXml(formData);
    const success = await copyToClipboard(xml);
    if (success) {
      setCopyFeedback('xml');
      setTimeout(() => setCopyFeedback(null), 2000);
    }
  };

  const handleCopyJson = async () => {
    const json = JSON.stringify(toIatiJson(formData), null, 2);
    const success = await copyToClipboard(json);
    if (success) {
      setCopyFeedback('json');
      setTimeout(() => setCopyFeedback(null), 2000);
    }
  };

  const handleOpen = () => {
    window.open(formData.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-200",
      "bg-white hover:shadow-md border border-gray-200"
    )}>
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Thumbnail/Icon */}
          <div className="flex-shrink-0">
            {formData.thumbnailUrl ? (
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={formData.thumbnailUrl}
                  alt={primaryTitle?.text || 'Document thumbnail'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="hidden w-full h-full flex items-center justify-center">
                  <FileIcon className="w-8 h-8 text-gray-500" />
                </div>
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
                      {primaryTitle?.text || 'Untitled Document'}
                    </h3>
                {primaryDescription && primaryDescription.text && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {primaryDescription.text}
                      </p>
                )}
              </div>
              
              <div className="flex items-center gap-2">
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
            </div>
            
            {/* Compact Info Grid - Always visible when not editing */}
            {!isEditing && (
              <div className="mt-3 space-y-2">
                {/* First row: Format, Category, Language */}
                <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-xs">
                  {getFormatLabel(formData.format)}
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
                
                {formData.languageCodes && formData.languageCodes.length > 0 && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Languages className="w-3 h-3" />
                      {getLanguageNames(formData.languageCodes).join(', ')}
                  </Badge>
                )}
                
                {formData.documentDate && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(formData.documentDate), 'MMM d, yyyy')}
                  </Badge>
                )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-1 pt-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onEdit?.()}
                    className="text-xs gap-1 h-7 px-2"
            >
              <Edit className="w-3 h-3" />
              Edit
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={handleOpen}
                    className="text-xs gap-1 h-7 px-2"
            >
              <ExternalLink className="w-3 h-3" />
              Open
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(formData.url)}
                    className="text-xs gap-1 h-7 px-2 text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </Button>
                </div>
          </div>
        )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 