/**
 * HTML Sanitization Utility
 * Provides secure HTML sanitization to prevent XSS attacks
 */

import DOMPurify from 'dompurify';

// Safe HTML tags and attributes for rich text content
const RICH_TEXT_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'a'
  ],
  ALLOWED_ATTR: ['href', 'title'],
  ALLOWED_URI_REGEXP: /^https?:\/\//
};

// Very restrictive config for plain text with minimal formatting
const MINIMAL_CONFIG = {
  ALLOWED_TAGS: ['strong', 'em', 'br'],
  ALLOWED_ATTR: []
};

// No HTML allowed - strips all tags
const TEXT_ONLY_CONFIG = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: []
};

/**
 * Sanitize HTML content for rich text display
 * Allows common formatting tags but removes dangerous content
 */
export function sanitizeRichText(html: string): string {
  if (!html) return '';
  
  // Only run on client-side where DOMPurify can access the DOM
  if (typeof window === 'undefined') {
    // Server-side fallback - strip all HTML
    return html.replace(/<[^>]*>/g, '');
  }
  
  return DOMPurify.sanitize(html, RICH_TEXT_CONFIG);
}

/**
 * Sanitize HTML content with minimal formatting
 * Only allows basic formatting like bold, italic, line breaks
 */
export function sanitizeMinimal(html: string): string {
  if (!html) return '';
  
  if (typeof window === 'undefined') {
    return html.replace(/<[^>]*>/g, '');
  }
  
  return DOMPurify.sanitize(html, MINIMAL_CONFIG);
}

/**
 * Strip all HTML tags and return plain text
 * Use for user-generated content that should not contain any HTML
 */
export function sanitizeTextOnly(html: string): string {
  if (!html) return '';
  
  if (typeof window === 'undefined') {
    return html.replace(/<[^>]*>/g, '');
  }
  
  return DOMPurify.sanitize(html, TEXT_ONLY_CONFIG);
}

/**
 * Sanitize URL to prevent javascript: and other dangerous schemes
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  
  // Allow only http, https, mailto, tel protocols
  const allowedProtocols = /^(https?|mailto|tel):/i;
  
  if (url.startsWith('/') || url.startsWith('#')) {
    // Relative URLs are safe
    return url;
  }
  
  if (allowedProtocols.test(url)) {
    return url;
  }
  
  // Dangerous or unknown protocol - return empty string
  return '';
}

/**
 * Create a safe HTML string for React dangerouslySetInnerHTML
 */
export function createSafeHTML(html: string, level: 'rich' | 'minimal' | 'text' = 'minimal') {
  let sanitized: string;
  
  switch (level) {
    case 'rich':
      sanitized = sanitizeRichText(html);
      break;
    case 'text':
      sanitized = sanitizeTextOnly(html);
      break;
    default:
      sanitized = sanitizeMinimal(html);
  }
  
  return { __html: sanitized };
}