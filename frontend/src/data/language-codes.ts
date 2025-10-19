// ISO 639-1 Language Codes for IATI
// Common languages used in development and humanitarian work

export interface LanguageCode {
  code: string;
  name: string;
}

export const COMMON_LANGUAGES: LanguageCode[] = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
  { code: 'ar', name: 'Arabic' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'hi', name: 'Hindi' },
  { code: 'bn', name: 'Bengali' },
  { code: 'sw', name: 'Swahili' },
  { code: 'am', name: 'Amharic' },
  { code: 'ur', name: 'Urdu' },
  { code: 'ne', name: 'Nepali' },
  { code: 'my', name: 'Burmese' },
  { code: 'ps', name: 'Pashto' },
  { code: 'fa', name: 'Persian' },
  { code: 'so', name: 'Somali' },
  { code: 'ti', name: 'Tigrinya' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'tr', name: 'Turkish' },
  { code: 'vi', name: 'Vietnamese' },
];

// Helper to get language name by code
export function getLanguageName(code: string): string {
  const language = COMMON_LANGUAGES.find(l => l.code === code);
  return language ? language.name : code.toUpperCase();
}

// Helper to format language for display (e.g., "EN - English")
export function formatLanguageDisplay(code: string): string {
  const language = COMMON_LANGUAGES.find(l => l.code === code);
  return language ? `${code.toUpperCase()} - ${language.name}` : code.toUpperCase();
}

