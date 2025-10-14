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

interface DocumentFormEnhancedProps {
  isOpen: boolean;
  onClose: () => void;
  document: IatiDocumentLink | null;
  onSave: (document: IatiDocumentLink) => void;
  fetchHead?: (url: string) => Promise<{ format?: string; size?: number } | null>;
  locale?: string;
  isUploaded?: boolean;
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
}: DocumentFormEnhancedProps) {
  const [formatSearch, setFormatSearch] = React.useState('');
  const [titleLangSearch, setTitleLangSearch] = React.useState('');
  const [descLangSearch, setDescLangSearch] = React.useState('');
  const [categorySearch, setCategorySearch] = React.useState('');
  const [docLangSearch, setDocLangSearch] = React.useState('');
  
  const [formData, setFormData] = React.useState<IatiDocumentLink>(() => 
    document || {
      url: '',
      format: '',
      title: [{ text: '', lang: locale }],
      description: [{ text: '', lang: locale }], // Always include description
      languageCodes: ['en'], // Default to English
      recipientCountries: ['MM'], // Default to Myanmar
    }
  );
  
  const [urlMetadata, setUrlMetadata] = React.useState<{
    format?: string;
    size?: number;
    error?: string;
  }>({});
  
  const [selectedCountries, setSelectedCountries] = React.useState<string[]>(
    formData.recipientCountries || []
  );
  
  const [countryInput, setCountryInput] = React.useState('');
  const [showValidation, setShowValidation] = React.useState(false);
  
  // Popover states
  const [formatOpen, setFormatOpen] = React.useState(false);
  const [categoryOpen, setCategoryOpen] = React.useState(false);
  const [languagesOpen, setLanguagesOpen] = React.useState(false);
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
                  </div>
                )}
                
                <div>
                  <Label>Format (MIME Type)</Label>
                  <Popover open={formatOpen} onOpenChange={setFormatOpen}>
                    <PopoverTrigger>
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
                  <Label>Title <span className="text-red-500">*</span></Label>
                  <Input
                    value={formData.title[0]?.text || ''}
                    onChange={(e) => updateNarrative('title', 0, { text: e.target.value })}
                    placeholder="Document title"
                    className="w-full mt-1"
                  />
                  <div className="mt-2">
                    <Label className="text-xs text-muted-foreground">Title Language</Label>
                    <Popover open={titleLangOpen} onOpenChange={setTitleLangOpen}>
                      <PopoverTrigger>
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
                      <PopoverTrigger>
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
                    <PopoverTrigger>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={categoryOpen}
                        className="w-full justify-between mt-1 text-left font-normal"
                      >
                        <span className="truncate">
                          {formData.categoryCode
                            ? DOCUMENT_CATEGORIES.find(c => c.code === formData.categoryCode)?.name
                            : "Select category..."}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[600px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search categories..." className="h-9" autoFocus />
                        <CommandEmpty>No category found.</CommandEmpty>
                        <CommandList>
                          <CommandGroup>
                            <CommandItem
                              onSelect={() => {
                                setFormData(prev => ({ ...prev, categoryCode: undefined }));
                                setCategoryOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  !formData.categoryCode ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <span className="ml-8">None</span>
                            </CommandItem>
                            {DOCUMENT_CATEGORIES.map(cat => (
                              <CommandItem
                                key={cat.code}
                                onSelect={() => {
                                  setFormData(prev => ({ ...prev, categoryCode: cat.code }));
                                  setCategoryOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.categoryCode === cat.code ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <span className="ml-2 text-muted-foreground w-8">{cat.code}</span>
                                <div className="ml-4 flex-1">
                                  <div className="font-medium">{cat.name}</div>
                                  <div className="text-sm text-muted-foreground">{cat.description}</div>
                                </div>
                              </CommandItem>
                            ))}
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
                    <PopoverTrigger>
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
