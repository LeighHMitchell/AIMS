import React from 'react';
import { X, Plus, Trash2, Info, Globe, HelpCircle, ChevronsUpDown, Check, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import {
  IatiDocumentLink,
  Narrative,
  DOCUMENT_CATEGORIES,
  COMMON_LANGUAGES,
  FILE_FORMATS,
  inferMimeFromUrl,
  isImageMime,
  validateIatiDocument,
} from '@/lib/iatiDocumentLink';
import { apiFetch } from '@/lib/api-fetch';

interface DocumentFormEnhancedProps {
  isOpen: boolean;
  onClose: () => void;
  document: IatiDocumentLink | null;
  onSave: (document: IatiDocumentLink) => void;
  fetchHead?: (url: string) => Promise<{ format?: string; size?: number } | null>;
  locale?: string;
  isUploaded?: boolean;
  activityId?: string;
}

// Extended language list with full names
const LANGUAGES_WITH_NAMES = COMMON_LANGUAGES.map(lang => ({
  ...lang,
  display: `${lang.name} (${lang.code})`
}));

export function DocumentFormEnhanced({
  isOpen,
  onClose,
  document,
  onSave,
  fetchHead,
  locale = 'en',
  isUploaded = false,
  activityId,
}: DocumentFormEnhancedProps) {
  const [formatSearch, setFormatSearch] = React.useState('');
  const [titleLangSearch, setTitleLangSearch] = React.useState('');
  const [descLangSearch, setDescLangSearch] = React.useState('');
  const [categorySearch, setCategorySearch] = React.useState('');
  const [docLangSearch, setDocLangSearch] = React.useState('');
  
  const [formData, setFormData] = React.useState<IatiDocumentLink>(() => {
    const initial = document || {
      url: '',
      format: '',
      title: [{ text: '', lang: locale }],
      description: [{ text: '', lang: locale }], // Always include description
      languageCodes: ['en'], // Default to English
      recipientCountries: ['MM'], // Default to Myanmar
    };
    
    // Ensure categoryCodes array exists - prefer from document, fallback to categoryCode
    if (document) {
      if (document.categoryCodes && document.categoryCodes.length > 0) {
        initial.categoryCodes = document.categoryCodes;
        initial.categoryCode = document.categoryCodes[0]; // For backward compatibility
      } else if (document.categoryCode) {
        initial.categoryCodes = [document.categoryCode];
        initial.categoryCode = document.categoryCode;
      }
    }
    
    return initial;
  });
  
  const [urlMetadata, setUrlMetadata] = React.useState<{
    format?: string;
    size?: number;
    error?: string;
  }>({});
  
  const [thumbnailLoading, setThumbnailLoading] = React.useState(false);
  const [thumbnailError, setThumbnailError] = React.useState<string | null>(null);
  
  const [selectedCountries, setSelectedCountries] = React.useState<string[]>(
    formData.recipientCountries || []
  );
  
  const [countryInput, setCountryInput] = React.useState('');
  const [showValidation, setShowValidation] = React.useState(false);
  
  // Selected categories state
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>(() => {
    if (formData.categoryCodes && formData.categoryCodes.length > 0) {
      return formData.categoryCodes;
    }
    return formData.categoryCode ? [formData.categoryCode] : [];
  });
  
  // Popover states
  const [formatOpen, setFormatOpen] = React.useState(false);
  const [categoryOpen, setCategoryOpen] = React.useState(false);
  const [languagesOpen, setLanguagesOpen] = React.useState(false);
  
  // Update formData when selectedCategories changes
  React.useEffect(() => {
    setFormData(prev => ({
      ...prev,
      categoryCodes: selectedCategories.length > 0 ? selectedCategories : undefined,
      categoryCode: selectedCategories.length > 0 ? selectedCategories[0] : undefined, // For backward compatibility
    }));
  }, [selectedCategories]);
  const [titleLangOpen, setTitleLangOpen] = React.useState(false);
  const [descLangOpen, setDescLangOpen] = React.useState(false);
  
  // Filtered lists
  const filteredFormats = React.useMemo(() => {
    if (!formatSearch) return Object.entries(FILE_FORMATS);
    const query = formatSearch.toLowerCase();
    return Object.entries(FILE_FORMATS).filter(([mime, label]) =>
      mime.toLowerCase().includes(query) || label.toLowerCase().includes(query)
    );
  }, [formatSearch]);
  
  const filteredTitleLanguages = React.useMemo(() => {
    if (!titleLangSearch) return LANGUAGES_WITH_NAMES;
    const query = titleLangSearch.toLowerCase();
    return LANGUAGES_WITH_NAMES.filter(lang =>
      lang.code.toLowerCase().includes(query) || lang.name.toLowerCase().includes(query)
    );
  }, [titleLangSearch]);
  
  const filteredDescLanguages = React.useMemo(() => {
    if (!descLangSearch) return LANGUAGES_WITH_NAMES;
    const query = descLangSearch.toLowerCase();
    return LANGUAGES_WITH_NAMES.filter(lang =>
      lang.code.toLowerCase().includes(query) || lang.name.toLowerCase().includes(query)
    );
  }, [descLangSearch]);
  
  const filteredDocLanguages = React.useMemo(() => {
    if (!docLangSearch) return LANGUAGES_WITH_NAMES;
    const query = docLangSearch.toLowerCase();
    return LANGUAGES_WITH_NAMES.filter(lang =>
      lang.code.toLowerCase().includes(query) || lang.name.toLowerCase().includes(query)
    );
  }, [docLangSearch]);
  
  const filteredCategories = React.useMemo(() => {
    if (!categorySearch) return DOCUMENT_CATEGORIES;
    const query = categorySearch.toLowerCase();
    return DOCUMENT_CATEGORIES.filter(cat =>
      cat.code.toLowerCase().includes(query) ||
      cat.name.toLowerCase().includes(query) ||
      cat.description.toLowerCase().includes(query)
    );
  }, [categorySearch]);
  
  const validation = React.useMemo(() => {
    try {
      return validateIatiDocument(formData);
    } catch (error) {
      console.error('Validation error in DocumentForm:', error);
      return { ok: true, issues: [] };
    }
  }, [formData]);
  
  const isImage = formData.format && isImageMime(formData.format);
  
  React.useEffect(() => {
    setShowValidation(false);
    if (document) {
      setFormData(document);
      setSelectedCountries(document.recipientCountries || []);
    } else {
      setFormData({
        url: '',
        format: '',
        title: [{ text: '', lang: locale }],
        description: [{ text: '', lang: locale }], // Always include description
        languageCodes: [],
        recipientCountries: [],
      });
      setSelectedCountries([]);
    }
  }, [document, locale]);
  
  const handleUrlBlur = async () => {
    if (!formData.url) return;
    
    const inferredMime = inferMimeFromUrl(formData.url);
    if (inferredMime && !formData.format) {
      setFormData(prev => ({ ...prev, format: inferredMime }));
    }
    
    // Check if it's a PDF and we don't already have a thumbnail
    const isPdf = formData.url.toLowerCase().endsWith('.pdf') || 
                  inferredMime === 'application/pdf' ||
                  formData.format === 'application/pdf';
    
    // Generate thumbnail for PDF URLs if we don't have one yet
    if (isPdf && !formData.thumbnailUrl && !thumbnailLoading) {
      setThumbnailLoading(true);
      setThumbnailError(null);
      
      try {
        const response = await apiFetch('/api/documents/generate-thumbnail', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: formData.url,
            activityId: activityId,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to generate thumbnail' }));
          throw new Error(errorData.error || 'Failed to generate thumbnail');
        }
        
        const data = await response.json();
        
        if (data.thumbnailUrl) {
          setFormData(prev => ({ ...prev, thumbnailUrl: data.thumbnailUrl }));
        }
      } catch (error) {
        console.error('Thumbnail generation error:', error);
        setThumbnailError(error instanceof Error ? error.message : 'Failed to generate thumbnail');
        // Don't block form submission if thumbnail generation fails
      } finally {
        setThumbnailLoading(false);
      }
    }
    
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
  
  const updateNarrative = (
    field: 'title' | 'description',
    index: number,
    updates: Partial<Narrative>
  ) => {
    const narratives = field === 'title' ? formData.title : (formData.description || []);
    const updated = [...narratives];
    
    // Ensure we have an item at the index
    if (!updated[index]) {
      updated[index] = { text: '', lang: locale };
    }
    
    updated[index] = { ...updated[index], ...updates };
    
    setFormData(prev => ({
      ...prev,
      [field]: updated,
    }));
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
      handleClose();
    }
  };
  
  const handleClose = () => {
    setShowValidation(false);
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[90vh] overflow-hidden flex flex-col p-0 mb-8">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>
            {document ? 'Edit Document Link' : 'Add Document Link'}
          </DialogTitle>
          <DialogDescription>
            Configure an IATI-compliant document link with all required metadata.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 px-6 mt-6">
          <div className="space-y-6 pb-8">
            {/* Link Section */}
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Link Information
              </h3>
              
              <div className="space-y-4">
                {/* Only show URL field for non-uploaded documents */}
                {!isUploaded && (
                  <div>
                    <Label htmlFor="url">URL</Label>
                    <Input
                      id="url"
                      type="url"
                      value={formData.url}
                      onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                      onBlur={handleUrlBlur}
                      placeholder="https://example.org/document.pdf"
                      className="mt-1"
                    />
                    {urlMetadata.error && (
                      <p className="text-xs text-amber-600 mt-1">{urlMetadata.error}</p>
                    )}
                    {urlMetadata.size && (
                      <p className="text-xs text-gray-500 mt-1">
                        File size: {(urlMetadata.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                    {thumbnailLoading && (
                      <p className="text-xs text-blue-600 mt-1">
                        Generating thumbnail from PDF...
                      </p>
                    )}
                    {thumbnailError && (
                      <p className="text-xs text-amber-600 mt-1">
                        Thumbnail: {thumbnailError}
                      </p>
                    )}
                    {formData.thumbnailUrl && !thumbnailLoading && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ Thumbnail generated successfully
                      </p>
                    )}
                  </div>
                )}
                
                <div>
                  <Label>Format (MIME Type)</Label>
                  <Popover open={formatOpen} onOpenChange={setFormatOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={formatOpen}
                        className="w-full justify-between mt-1 text-left font-normal"
                      >
                        <span className="truncate">
                          {formData.format ? (
                            <div>
                              <div className="font-medium">{FILE_FORMATS[formData.format] || 'Unknown'}</div>
                              <div className="text-xs text-muted-foreground">{formData.format}</div>
                            </div>
                          ) : (
                            "Select format..."
                          )}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[600px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search formats..." className="h-9" autoFocus />
                        <CommandEmpty>No format found.</CommandEmpty>
                        <CommandList>
                          <CommandGroup>
                            {Object.entries(FILE_FORMATS).map(([mime, label]) => (
                              <CommandItem
                                key={mime}
                                onSelect={() => {
                                  setFormData(prev => ({ ...prev, format: mime }));
                                  setFormatOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.format === mime ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex-1">
                                  <div className="font-medium">{label}</div>
                                  <div className="text-sm text-muted-foreground">{mime}</div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Metadata Section */}
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Metadata
              </h3>
              
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <Label>Title <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
                  <Input
                    value={formData.title[0]?.text || ''}
                    onChange={(e) => updateNarrative('title', 0, { text: e.target.value })}
                    placeholder="Document title"
                    className="w-full mt-1"
                  />
                  <div className="mt-2">
                    <Label className="text-xs text-muted-foreground">Title Language</Label>
                    <Popover open={titleLangOpen} onOpenChange={setTitleLangOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between mt-1 text-left font-normal"
                        >
                          {LANGUAGES_WITH_NAMES.find(l => l.code === formData.title[0]?.lang)?.name || 'Select language...'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search languages..." className="h-9" autoFocus />
                          <CommandEmpty>No language found.</CommandEmpty>
                          <CommandList>
                            <CommandGroup>
                              {LANGUAGES_WITH_NAMES.map(lang => (
                                <CommandItem
                                  key={lang.code}
                                  onSelect={() => {
                                    updateNarrative('title', 0, { lang: lang.code });
                                    setTitleLangOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      formData.title[0]?.lang === lang.code ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <span className="ml-2 text-muted-foreground">{lang.code}</span>
                                  <span className="ml-4">{lang.name}</span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                
                {/* Description */}
                <div>
                  <Label>Description {isImage && '(Caption)'}</Label>
                  <Textarea
                    value={formData.description?.[0]?.text || ''}
                    onChange={(e) => updateNarrative('description', 0, { text: e.target.value })}
                    placeholder={isImage ? "Image caption" : "Document description"}
                    className="w-full mt-1 min-h-[80px] resize-y"
                    rows={3}
                  />
                  <div className="mt-2">
                    <Label className="text-xs text-muted-foreground">Description Language</Label>
                    <Popover open={descLangOpen} onOpenChange={setDescLangOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between mt-1 text-left font-normal"
                        >
                          {LANGUAGES_WITH_NAMES.find(l => l.code === (formData.description?.[0]?.lang || locale))?.name || 'Select language...'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search languages..." className="h-9" autoFocus />
                          <CommandEmpty>No language found.</CommandEmpty>
                          <CommandList>
                            <CommandGroup>
                              {LANGUAGES_WITH_NAMES.map(lang => (
                                <CommandItem
                                  key={lang.code}
                                  onSelect={() => {
                                    updateNarrative('description', 0, { lang: lang.code });
                                    setDescLangOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      (formData.description?.[0]?.lang || locale) === lang.code ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <span className="ml-2 text-muted-foreground">{lang.code}</span>
                                  <span className="ml-4">{lang.name}</span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                
                {/* Category */}
                <div>
                  <Label>Document Category</Label>
                  <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                    <PopoverTrigger asChild>
                      <div className="flex flex-wrap gap-2 items-center min-h-[40px] p-2 border rounded-md cursor-pointer">
                        {selectedCategories.length > 0 ? (
                          selectedCategories.map(categoryCode => {
                            const category = DOCUMENT_CATEGORIES.find(c => c.code === categoryCode);
                            return (
                              <Badge
                                key={categoryCode}
                                variant="secondary"
                                className="text-xs"
                              >
                                {category?.name || categoryCode}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCategories(prev => prev.filter(c => c !== categoryCode));
                                  }}
                                  className="ml-2 hover:text-destructive"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            );
                          })
                        ) : (
                          <span className="text-muted-foreground text-sm">Select categories...</span>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={categoryOpen}
                        className="w-full justify-between mt-1 text-left font-normal"
                        onClick={() => setCategoryOpen(!categoryOpen)}
                      >
                        <span>{selectedCategories.length > 0 ? `${selectedCategories.length} selected` : "Select categories..."}</span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[600px] p-0" align="start">
                      <Command>
                        <CommandInput 
                          placeholder="Search categories..." 
                          className="h-9" 
                          value={categorySearch}
                          onValueChange={setCategorySearch}
                        />
                        <CommandEmpty>No category found.</CommandEmpty>
                        <CommandList>
                          <CommandGroup>
                            {DOCUMENT_CATEGORIES
                              .filter(cat => {
                                if (!categorySearch) return true;
                                const query = categorySearch.toLowerCase();
                                return cat.code.toLowerCase().includes(query) ||
                                       cat.name.toLowerCase().includes(query) ||
                                       cat.description.toLowerCase().includes(query);
                              })
                              .map(cat => {
                                const isSelected = selectedCategories.includes(cat.code);
                                return (
                                  <CommandItem
                                    key={cat.code}
                                    onSelect={() => {
                                      if (isSelected) {
                                        setSelectedCategories(prev => prev.filter(c => c !== cat.code));
                                      } else {
                                        setSelectedCategories(prev => [...prev, cat.code]);
                                      }
                                      // Keep popover open for multi-select
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        isSelected ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <span className="ml-2 text-muted-foreground w-8">{cat.code}</span>
                                    <div className="ml-4 flex-1">
                                      <div className="font-medium">{cat.name}</div>
                                      <div className="text-sm text-muted-foreground">{cat.description}</div>
                                    </div>
                                  </CommandItem>
                                );
                              })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                
                {/* Document Languages */}
                <div>
                  <Label>Document Languages</Label>
                  <Popover open={languagesOpen} onOpenChange={setLanguagesOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={languagesOpen}
                        className="w-full justify-between mt-1 text-left font-normal"
                      >
                        <span className="truncate">
                          {formData.languageCodes && formData.languageCodes.length > 0
                            ? `${formData.languageCodes.length} language${formData.languageCodes.length > 1 ? 's' : ''} selected`
                            : "Select languages..."}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search languages..." className="h-9" />
                        <CommandEmpty>No language found.</CommandEmpty>
                        <CommandList>
                          <CommandGroup>
                            {LANGUAGES_WITH_NAMES.map(lang => (
                              <CommandItem
                                key={lang.code}
                                onSelect={() => {
                                  const currentLangs = formData.languageCodes || [];
                                  const updated = currentLangs.includes(lang.code)
                                    ? currentLangs.filter(c => c !== lang.code)
                                    : [...currentLangs, lang.code];
                                  setFormData(prev => ({ ...prev, languageCodes: updated }));
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.languageCodes?.includes(lang.code) ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <span className="ml-2 text-muted-foreground">{lang.code}</span>
                                <span className="ml-4">{lang.name}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {formData.languageCodes && formData.languageCodes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {formData.languageCodes.map(code => (
                        <Badge key={code} variant="secondary" className="text-xs">
                          {LANGUAGES_WITH_NAMES.find(l => l.code === code)?.name || code}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Document Date */}
                <div>
                  <Label htmlFor="documentDate">Document Date</Label>
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
              </div>
            </div>
            
            <Separator />
            
            {/* Geography Section */}
            <div>
              <h3 className="text-sm font-medium mb-3">Geography (Optional)</h3>
              
              <div className="space-y-4">
                {/* Recipient Countries */}
                <div>
                  <Label>Recipient Countries</Label>
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
          </div>
        </ScrollArea>
        
        <div className="flex justify-end gap-2 p-6 border-t bg-background">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={showValidation && !validation.ok}>
            Save Document Link
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
