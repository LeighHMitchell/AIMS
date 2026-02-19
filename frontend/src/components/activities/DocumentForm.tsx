import React from 'react';
import { X, Plus, Trash2, Info, Globe, HelpCircle, Save } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  IatiDocumentLink,
  Narrative,
  DOCUMENT_CATEGORIES,
  COMMON_LANGUAGES,
  FILE_FORMATS,
  EXT_TO_MIME,
  inferMimeFromUrl,
  isImageMime,
  validateIatiDocument,
} from '@/lib/iatiDocumentLink';

interface DocumentFormProps {
  isOpen: boolean;
  onClose: () => void;
  document: IatiDocumentLink | null;
  onSave: (document: IatiDocumentLink) => void;
  fetchHead?: (url: string) => Promise<{ format?: string; size?: number } | null>;
  locale?: string;
  isUploaded?: boolean;
}

export function DocumentForm({
  isOpen,
  onClose,
  document,
  onSave,
  fetchHead,
  locale = 'en',
  isUploaded = false,
}: DocumentFormProps) {
  const [formData, setFormData] = React.useState<IatiDocumentLink>(() => 
    document || {
      url: '',
      format: '',
      title: [{ text: '', lang: locale }],
      description: [],
      languageCodes: [],
      recipientCountries: [],
    }
  );
  
  const [urlMetadata, setUrlMetadata] = React.useState<{
    format?: string;
    size?: number;
    error?: string;
  }>({});
  
  const [selectedLanguages, setSelectedLanguages] = React.useState<string[]>(
    formData.languageCodes || []
  );
  
  const [selectedCountries, setSelectedCountries] = React.useState<string[]>(
    formData.recipientCountries || []
  );
  
  const [countryInput, setCountryInput] = React.useState('');
  const [showValidation, setShowValidation] = React.useState(false);
  
  const validation = React.useMemo(() => {
    try {
      return validateIatiDocument(formData);
    } catch (error) {
      console.error('Validation error in DocumentForm:', error);
      return { ok: true, issues: [] }; // Default to no errors to prevent crashes
    }
  }, [formData]);
  const isImage = formData.format && isImageMime(formData.format);
  
  React.useEffect(() => {
    setShowValidation(false); // Reset validation display when switching documents
    if (document) {
      setFormData(document);
      setSelectedLanguages(document.languageCodes || []);
      setSelectedCountries(document.recipientCountries || []);
    } else {
      setFormData({
        url: '',
        format: '',
        title: [{ text: '', lang: locale }],
        description: [],
        languageCodes: [],
        recipientCountries: [],
      });
      setSelectedLanguages([]);
      setSelectedCountries([]);
    }
  }, [document, locale]);
  
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
      handleClose();
    }
  };
  
  const handleClose = () => {
    setShowValidation(false);
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {document ? 'Edit Document Link' : 'Add Document Link'}
          </DialogTitle>
          <DialogDescription>
            Configure an IATI-compliant document link with all required metadata.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 mt-4">
          <div className="space-y-6 pr-4">
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
                    <Label htmlFor="url">
                      URL
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="ml-1">
                            <HelpCircle className="w-3 h-3 text-gray-400" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="text-sm">
                          The document URL must use HTTPS and be publicly accessible.
                        </PopoverContent>
                      </Popover>
                    </Label>
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
                  <Label htmlFor="format">
                    Format (MIME Type)
                  </Label>
                  <Select
                    value={formData.format}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, format: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(FILE_FORMATS).map(([mime, label]) => (
                        <SelectItem key={mime} value={mime}>
                          <div>
                            <div className="font-medium">{label}</div>
                            <div className="text-xs text-muted-foreground">{mime}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                {/* Title Narratives */}
                <div>
                  <Label>
                    Title
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" />
                  </Label>
                  <div className="space-y-2 mt-2">
                    {formData.title.map((narrative, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={narrative.text}
                          onChange={(e) => updateNarrative('title', index, { text: e.target.value })}
                          placeholder="Document title"
                          className="flex-1"
                        />
                        <Select
                          value={narrative.lang}
                          onValueChange={(value) => updateNarrative('title', index, { lang: value })}
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
                        {formData.title.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeNarrative('title', index)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addNarrative('title')}
                      className="gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add language
                    </Button>
                  </div>
                </div>
                
                {/* Description Narratives */}
                <div>
                  <Label>Description {isImage && '(Caption)'}</Label>
                  <div className="space-y-2 mt-2">
                    {(formData.description || []).map((narrative, index) => (
                      <div key={index} className="flex gap-2">
                        <Textarea
                          value={narrative.text}
                          onChange={(e) => updateNarrative('description', index, { text: e.target.value })}
                          placeholder={isImage ? "Image caption" : "Document description"}
                          className="flex-1 min-h-[80px]"
                        />
                        <Select
                          value={narrative.lang}
                          onValueChange={(value) => updateNarrative('description', index, { lang: value })}
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
                          onClick={() => removeNarrative('description', index)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addNarrative('description')}
                      className="gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add description
                    </Button>
                  </div>
                </div>
                
                {/* Category */}
                <div>
                  <Label htmlFor="category">Document Category</Label>
                  <Select
                    value={formData.categoryCode || 'none'}
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      categoryCode: value === 'none' ? undefined : value 
                    }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {DOCUMENT_CATEGORIES.map(cat => (
                        <SelectItem key={cat.code} value={cat.code}>
                          {cat.code} - {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Languages */}
                <div>
                  <Label>Document Languages</Label>
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
              <h3 className="text-sm font-medium mb-3">Geography</h3>
              
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
                
                {/* Recipient Region */}
                <div>
                  <Label>Recipient Region</Label>
                  <div className="space-y-2 mt-2">
                    <Input
                      value={formData.recipientRegion?.code || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        recipientRegion: e.target.value ? {
                          code: e.target.value,
                          vocabulary: prev.recipientRegion?.vocabulary || '1',
                          vocabularyUri: prev.recipientRegion?.vocabularyUri,
                        } : undefined,
                      }))}
                      placeholder="Region code"
                    />
                    {formData.recipientRegion && (
                      <>
                        <Select
                          value={formData.recipientRegion.vocabulary}
                          onValueChange={(value) => setFormData(prev => ({
                            ...prev,
                            recipientRegion: prev.recipientRegion ? {
                              ...prev.recipientRegion,
                              vocabulary: value,
                            } : undefined,
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">OECD DAC</SelectItem>
                            <SelectItem value="2">UN</SelectItem>
                            <SelectItem value="99">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        {formData.recipientRegion.vocabulary === '99' && (
                          <Input
                            value={formData.recipientRegion.vocabularyUri || ''}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              recipientRegion: prev.recipientRegion ? {
                                ...prev.recipientRegion,
                                vocabularyUri: e.target.value,
                              } : undefined,
                            }))}
                            placeholder="Vocabulary URI (required)"
                          />
                        )}
                      </>
                    )}
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
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={showValidation && !validation.ok}>
            <Save className="h-4 w-4 mr-2" />
            Save Document Link
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
