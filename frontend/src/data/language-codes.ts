// ISO 639-1 Language Codes for IATI
// Full list of languages from the IATI standard

import { LANGUAGES } from './languages';

export interface LanguageCode {
  code: string;
  name: string;
}

// Convert the LANGUAGES data structure to the LanguageCode format
export const COMMON_LANGUAGES: LanguageCode[] = LANGUAGES[0].types.map(lang => ({
  code: lang.code,
  name: lang.name
}));

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

