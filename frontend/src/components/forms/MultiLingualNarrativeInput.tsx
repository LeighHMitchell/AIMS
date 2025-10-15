"use client";

import React from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Narrative } from "@/types/country-budget-items";

interface MultiLingualNarrativeInputProps {
  value: Narrative;
  onChange: (value: Narrative) => void;
  primaryLanguage?: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// Common language options
const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ru', name: 'Russian' },
  { code: 'de', name: 'German' },
  { code: 'ja', name: 'Japanese' },
  { code: 'hi', name: 'Hindi' },
  { code: 'sw', name: 'Swahili' },
  { code: 'my', name: 'Burmese' },
];

export function MultiLingualNarrativeInput({
  value = {},
  onChange,
  primaryLanguage = 'en',
  label = "Description",
  placeholder = "Enter description...",
  disabled = false,
  className = "",
}: MultiLingualNarrativeInputProps) {
  const [showAdditionalLanguages, setShowAdditionalLanguages] = React.useState(false);
  const [additionalLanguages, setAdditionalLanguages] = React.useState<string[]>([]);

  // Initialize additional languages from existing value
  React.useEffect(() => {
    const existingLanguages = Object.keys(value).filter(lang => lang !== primaryLanguage);
    if (existingLanguages.length > 0) {
      setAdditionalLanguages(existingLanguages);
      setShowAdditionalLanguages(true);
    }
  }, []);

  const handlePrimaryChange = (text: string) => {
    const newValue = { ...value };
    if (text.trim()) {
      newValue[primaryLanguage] = text;
    } else {
      delete newValue[primaryLanguage];
    }
    onChange(newValue);
  };

  const handleAdditionalLanguageChange = (lang: string, text: string) => {
    const newValue = { ...value };
    if (text.trim()) {
      newValue[lang] = text;
    } else {
      delete newValue[lang];
    }
    onChange(newValue);
  };

  const addLanguage = () => {
    // Find first available language not already in use
    const usedLanguages = Object.keys(value);
    const availableLanguage = LANGUAGES.find(lang => !usedLanguages.includes(lang.code));
    if (availableLanguage) {
      setAdditionalLanguages([...additionalLanguages, availableLanguage.code]);
    }
  };

  const removeLanguage = (lang: string) => {
    setAdditionalLanguages(additionalLanguages.filter(l => l !== lang));
    const newValue = { ...value };
    delete newValue[lang];
    onChange(newValue);
  };

  const getLanguageName = (code: string) => {
    return LANGUAGES.find(lang => lang.code === code)?.name || code;
  };

  const availableLanguages = LANGUAGES.filter(
    lang => !Object.keys(value).includes(lang.code)
  );

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Primary Language Input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {label} ({getLanguageName(primaryLanguage)})
        </label>
        <textarea
          value={value[primaryLanguage] || ''}
          onChange={(e) => handlePrimaryChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={3}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
        />
      </div>

      {/* Additional Languages Section */}
      {!showAdditionalLanguages && availableLanguages.length > 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowAdditionalLanguages(true)}
          disabled={disabled}
          className="text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add translation
        </Button>
      )}

      {showAdditionalLanguages && (
        <div className="space-y-3 border-t pt-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">Additional Languages</h4>
            {availableLanguages.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLanguage}
                disabled={disabled}
                className="text-xs h-7"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add language
              </Button>
            )}
          </div>

          {additionalLanguages.map((lang) => (
            <div key={lang} className="space-y-2 p-3 bg-gray-50 rounded-md relative">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  {getLanguageName(lang)} ({lang})
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLanguage(lang)}
                  disabled={disabled}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <textarea
                value={value[lang] || ''}
                onChange={(e) => handleAdditionalLanguageChange(lang, e.target.value)}
                placeholder={`Enter ${getLanguageName(lang).toLowerCase()} translation...`}
                disabled={disabled}
                rows={3}
                className="flex w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </div>
          ))}

          {additionalLanguages.length === 0 && (
            <p className="text-sm text-muted-foreground italic">
              No additional translations added yet. Click "Add language" to add a translation.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export type { MultiLingualNarrativeInputProps };

