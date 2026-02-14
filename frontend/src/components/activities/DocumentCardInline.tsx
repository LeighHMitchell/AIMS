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
  ExternalLink,
  Trash2,
  AlertCircle,
  Save,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  HelpCircle,
} from 'lucide-react';
import { DocumentFormatSelect } from '@/components/forms/DocumentFormatSelect';
import { DocumentCategorySelect } from '@/components/forms/DocumentCategorySelect';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { 
  IatiDocumentLink, 
  Narrative,
  DOCUMENT_CATEGORIES, 
  COMMON_LANGUAGES,
  FILE_FORMATS,
  getFormatLabel,
  isImageMime,
  validateIatiDocument,
  inferMimeFromUrl,
} from '@/lib/iatiDocumentLink';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface DocumentCardInlineProps {
  document: IatiDocumentLink;
  onSave: (document: IatiDocumentLink) => void;
  onDelete: (url: string) => void;
  fetchHead?: (url: string) => Promise<{ format?: string; size?: number } | null>;
  locale?: string;
  isNew?: boolean;
}

export function DocumentCardInline({ 
  document, 
  onSave, 
  onDelete,
  fetchHead,
  locale = 'en',
  isNew = false
}: DocumentCardInlineProps) {
  const [isEditing, setIsEditing] = React.useState(isNew);
  const [isExpanded, setIsExpanded] = React.useState(isNew);
  const [formData, setFormData] = React.useState<IatiDocumentLink>(document);
  const [urlMetadata, setUrlMetadata] = React.useState<{
    format?: string;
    size?: number;
    error?: string;
  }>({});
  const [selectedLanguages, setSelectedLanguages] = React.useState<string[]>(
    document.languageCodes || []
  );
  const [selectedCountries, setSelectedCountries] = React.useState<string[]>(
    document.recipientCountries || []
  );
  const [countryInput, setCountryInput] = React.useState('');
  const [showValidation, setShowValidation] = React.useState(false);

  const validation = React.useMemo(() => {
    try {
      return validateIatiDocument(formData);
    } catch (error) {
      console.error('Validation error in DocumentCardInline:', error);
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
    setFormData(document);
    setSelectedLanguages(document.languageCodes || []);
    setSelectedCountries(document.recipientCountries || []);
  }, [document]);

  const handleUrlBlur = async () => {
    if (!formData.url) return;
    
    // Try to infer MIME from URL extension
    const inferredMime = inferMimeFromUrl(formData.url);
    if (inferredMime && !formData.format) {
      setFormData(prev => ({ ...prev, format: inferredMime }));
    }
    
    // Try to fetch HEAD if provided
    if (fetchHead) {
      try {
        setUrlMetadata({ error: undefined });
        const metadata = await fetchHead(formData.url);
        if (metadata) {
          setUrlMetadata(metadata);
          if (metadata.format && !formData.format) {
            setFormData(prev => ({ ...prev, format: metadata.format! }));
          }
        }
      } catch (error) {
        setUrlMetadata({ error: 'Unable to fetch URL metadata' });
      }
    }
  };

  const addNarrative = (field: 'title' | 'description') => {
    const narratives = field === 'title' ? formData.title : (formData.description || []);
    const newNarrative: Narrative = { text: '', lang: locale };
    
    setFormData(prev => ({
      ...prev,
      [field]: [...narratives, newNarrative],
    }));
  };

  const updateNarrative = (
    field: 'title' | 'description',
    index: number,
    updates: Partial<Narrative>
  ) => {
    const narratives = field === 'title' ? formData.title : (formData.description || []);
    const updated = [...narratives];
    updated[index] = { ...updated[index], ...updates };
    
    setFormData(prev => ({
      ...prev,
      [field]: updated,
    }));
  };

  const removeNarrative = (field: 'title' | 'description', index: number) => {
    const narratives = field === 'title' ? formData.title : (formData.description || []);
    const updated = narratives.filter((_, i) => i !== index);
    
    setFormData(prev => ({
      ...prev,
      [field]: updated,
    }));
  };

  const toggleLanguage = (langCode: string) => {
    const updated = selectedLanguages.includes(langCode)
      ? selectedLanguages.filter(c => c !== langCode)
      : [...selectedLanguages, langCode];
    
    setSelectedLanguages(updated);
    setFormData(prev => ({ ...prev, languageCodes: updated }));
  };

  const addCountry = () => {
    const code = countryInput.trim().toUpperCase();
    if (code.length === 2 && !selectedCountries.includes(code)) {
      const updated = [...selectedCountries, code];
      setSelectedCountries(updated);
      setFormData(prev => ({ ...prev, recipientCountries: updated }));
      setCountryInput('');
    }
  };

  const removeCountry = (code: string) => {
    const updated = selectedCountries.filter(c => c !== code);
    setSelectedCountries(updated);
    setFormData(prev => ({ ...prev, recipientCountries: updated }));
  };

  const handleSave = () => {
    setShowValidation(true);
    if (validation.ok) {
      onSave(formData);
      setIsEditing(false);
      setShowValidation(false);
      if (isNew) {
        setIsExpanded(false);
      }
    }
  };

  const handleCancel = () => {
    setFormData(document);
    setSelectedLanguages(document.languageCodes || []);
    setSelectedCountries(document.recipientCountries || []);
    setIsEditing(false);
    setShowValidation(false);
    setIsExpanded(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setIsExpanded(true);
  };


  const handleOpen = () => {
    window.open(formData.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card className={cn(
      "group relative overflow-hidden rounded-2xl shadow-sm hover:shadow-md transition-all duration-200",
      isEditing && "ring-2 ring-blue-500/20 shadow-lg"
    )}>
      <CardContent className="p-4">
        {/* Header Section - Always Visible */}
        <div className="flex gap-4">
          {/* Thumbnail/Icon */}
          <div className="flex-shrink-0 flex items-start">
            {isImage ? (
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                <img
                  src={formData.url}
                  alt={primaryTitle?.text || 'Document'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = `
                      <div class="w-20 h-20 flex items-center justify-center">
                        <svg class="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    `;
                  }}
                />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                <FileIcon className="w-10 h-10 text-gray-500" />
              </div>
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="title-0" className="text-sm font-medium">Title <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
                      <Input
                        id="title-0"
                        value={formData.title[0]?.text || ''}
                        onChange={(e) => updateNarrative('title', 0, { text: e.target.value })}
                        placeholder="Document title"
                        className="mt-1 h-10"
                      />
                    </div>
                    <div>
                      <Label htmlFor="url" className="text-sm font-medium">URL <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
                      <Input
                        id="url"
                        type="url"
                        value={formData.url}
                        onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                        onBlur={handleUrlBlur}
                        placeholder="https://example.org/document.pdf"
                        className="mt-1 h-10"
                      />
                      {urlMetadata.error && (
                        <p className="text-xs text-amber-600 mt-1">{urlMetadata.error}</p>
                      )}
                      {urlMetadata.size && (
                        <p className="text-xs text-gray-500 mt-1">
                          File size: {(urlMetadata.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="font-medium text-gray-900 truncate">
                      {primaryTitle?.text || 'Untitled Document'}
                    </h3>
                    {primaryDescription && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {primaryDescription.text}
                      </p>
                    )}
                  </>
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

                {/* Expand/Collapse toggle */}
                {!isEditing && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
            
            {/* Basic Badges - Always visible when not editing */}
            {!isEditing && (
              <div className="flex flex-wrap gap-2 mt-3">
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
                
                {(formData.recipientCountries?.length || formData.recipientRegion) && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <MapPin className="w-3 h-3" />
                    {formData.recipientCountries?.length
                      ? `${formData.recipientCountries.length} countries`
                      : 'Region'}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-6 space-y-6">
            <Separator />

            {isEditing ? (
              <div className="grid grid-cols-2 gap-4">
                {/* Format Selection */}
                <div>
                  <Label className="text-sm font-medium">
                    Format (MIME Type)
                  </Label>
                  <DocumentFormatSelect
                    value={formData.format}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, format: value }))}
                    placeholder="Select format..."
                    className="mt-1 pb-0"
                  />
                </div>

                {/* Additional Titles */}
                {formData.title.length > 1 && (
                  <div>
                    <Label className="text-sm font-medium">Additional Titles</Label>
                    <div className="space-y-2 mt-2">
                      {formData.title.slice(1).map((narrative, index) => (
                        <div key={index + 1} className="flex gap-2">
                          <Input
                            value={narrative.text}
                            onChange={(e) => updateNarrative('title', index + 1, { text: e.target.value })}
                            placeholder="Document title"
                            className="flex-1"
                          />
                          <Select
                            value={narrative.lang}
                            onValueChange={(value) => updateNarrative('title', index + 1, { lang: value })}
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {COMMON_LANGUAGES.map(lang => (
                                <SelectItem key={lang.code} value={lang.code}>
                                  {lang.code}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeNarrative('title', index + 1)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addNarrative('title')}
                  className="gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add title language
                </Button>

                {/* Description Field */}
                <div className="col-span-2">
                  <Label className="text-sm font-medium">
                    Description {isImage && '(Caption)'}
                  </Label>
                  {(formData.description || []).length === 0 ? (
                    <div className="mt-2">
                      <Textarea
                        placeholder={isImage ? "Add image caption..." : "Add document description..."}
                        className="w-full min-h-[72px] resize-y"
                        rows={3}
                        onChange={(e) => {
                          if (e.target.value) {
                            setFormData(prev => ({
                              ...prev,
                              description: [{ text: e.target.value, lang: locale }]
                            }));
                          }
                        }}
                      />
                    </div>
                  ) : (
                                         <div className="space-y-2 mt-2">
                       {(formData.description || []).map((narrative, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex gap-2">
                            <Select
                              value={narrative.lang}
                              onValueChange={(value) => updateNarrative('description', index, { lang: value })}
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {COMMON_LANGUAGES.map(lang => (
                                  <SelectItem key={lang.code} value={lang.code}>
                                    {lang.code.toUpperCase()}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeNarrative('description', index)}
                              className="px-2"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <Textarea
                            value={narrative.text}
                            onChange={(e) => updateNarrative('description', index, { text: e.target.value })}
                            placeholder={isImage ? "Image caption" : "Document description"}
                            className="w-full min-h-[72px] resize-y"
                            rows={3}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {(formData.description?.length || 0) > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addNarrative('description')}
                      className="gap-1 mt-2"
                    >
                      <Plus className="w-3 h-3" />
                      Add language
                    </Button>
                  )}
                </div>

                {/* Category */}
                <div>
                  <Label className="text-sm font-medium">Document Category</Label>
                  <DocumentCategorySelect
                    value={formData.categoryCode || ''}
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      categoryCode: value || undefined 
                    }))}
                    placeholder="Select category..."
                    className="mt-1 pb-0"
                  />
                </div>

                {/* Languages */}
                <div>
                  <Label className="text-sm font-medium">Document Languages</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {COMMON_LANGUAGES.slice(0, 10).map(lang => (
                      <Badge
                        key={lang.code}
                        variant={selectedLanguages.includes(lang.code) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleLanguage(lang.code)}
                      >
                        {lang.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Document Date */}
                <div>
                  <Label htmlFor="documentDate" className="text-sm font-medium">Document Date</Label>
                  <Input
                    id="documentDate"
                    type="date"
                    value={formData.documentDate || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      documentDate: e.target.value || undefined 
                    }))}
                    className="mt-1"
                  />
                </div>

                {/* Recipient Countries */}
                <div>
                  <Label className="text-sm font-medium">Recipient Countries</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={countryInput}
                      onChange={(e) => setCountryInput(e.target.value.toUpperCase())}
                      onKeyPress={(e) => e.key === 'Enter' && addCountry()}
                      placeholder="ISO code (e.g., KE)"
                      maxLength={2}
                      className="w-32"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addCountry}
                      disabled={countryInput.length !== 2}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedCountries.map(code => (
                      <Badge key={code} variant="secondary" className="gap-1">
                        {code}
                        <button
                          onClick={() => removeCountry(code)}
                          className="ml-1 hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Validation Errors */}
                {showValidation && !validation.ok && validation.issues && validation.issues.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-amber-800 mb-1">Validation Issues</p>
                    <ul className="text-xs text-amber-700 space-y-1">
                      {validation.issues.map((issue, i) => (
                        <li key={i}>• {issue.message}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Save/Cancel Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleSave}
                    disabled={showValidation && !validation.ok}
                    className="gap-1"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    className="gap-1"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Extended metadata display */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-xs font-medium text-gray-500">URL</Label>
                    <p className="truncate">{formData.url}</p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-500">Format</Label>
                    <p>{getFormatLabel(formData.format)}</p>
                  </div>
                  {formData.documentDate && (
                    <div>
                      <Label className="text-xs font-medium text-gray-500">Date</Label>
                      <p>{format(new Date(formData.documentDate), 'MMM d, yyyy')}</p>
                    </div>
                  )}
                  {category && (
                    <div>
                      <Label className="text-xs font-medium text-gray-500">Category</Label>
                      <p>{category.name}</p>
                    </div>
                  )}
                </div>

                {primaryDescription && (
                  <div>
                    <Label className="text-xs font-medium text-gray-500">
                      {isImage ? 'Caption' : 'Description'}
                    </Label>
                    <p className="text-sm text-gray-700 mt-1">{primaryDescription.text}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Actions */}
        {!isEditing && (
          <div className="flex gap-1 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleEdit}
              className="text-xs gap-1"
            >
              <Edit className="w-3 h-3" />
              Edit
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
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(formData.url)}
              className="text-xs gap-1 text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 