/**
 * HTML Sanitization Utility
 * Provides secure HTML sanitization to prevent XSS attacks
 * Uses isomorphic-dompurify for server-side and client-side support
 */

import DOMPurify from 'isomorphic-dompurify';

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
  ALLOWED_TAGS: [] as string[],
  ALLOWED_ATTR: [] as string[]
};

// IATI description config - allows common IATI formatting tags
// More permissive than minimal but controlled for descriptions
const IATI_DESCRIPTION_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u',
    'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'a', 'span', 'div'
  ],
  ALLOWED_ATTR: ['href', 'title', 'class'],
  ALLOWED_URI_REGEXP: /^https?:\/\//
};

/**
 * Sanitize HTML content for rich text display
 * Allows common formatting tags but removes dangerous content
 */
export function sanitizeRichText(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, RICH_TEXT_CONFIG);
}

/**
 * Sanitize HTML content with minimal formatting
 * Only allows basic formatting like bold, italic, line breaks
 */
export function sanitizeMinimal(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, MINIMAL_CONFIG);
}

/**
 * Strip all HTML tags and return plain text
 * Use for user-generated content that should not contain any HTML
 */
export function sanitizeTextOnly(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, TEXT_ONLY_CONFIG);
}

/**
 * Sanitize IATI description content
 * Preserves formatting commonly found in IATI activity descriptions
 * while removing potentially dangerous content
 */
export function sanitizeIatiDescription(html: string): string {
  if (!html) return '';
  
  // First decode common HTML entities that may appear in IATI data
  let decoded = html
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  // Sanitize the HTML
  return DOMPurify.sanitize(decoded, IATI_DESCRIPTION_CONFIG);
}

/**
 * Convert HTML to plain text, preserving some structure
 * Useful for previews or contexts where HTML rendering isn't appropriate
 */
export function htmlToPlainText(html: string): string {
  if (!html) return '';
  
  // First sanitize to remove any dangerous content
  const sanitized = sanitizeIatiDescription(html);
  
  // Convert block elements to newlines
  let text = sanitized
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/blockquote>/gi, '\n\n');
  
  // Strip remaining HTML tags
  text = DOMPurify.sanitize(text, TEXT_ONLY_CONFIG);
  
  // Clean up excessive whitespace
  text = text
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
  
  return text;
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
export function createSafeHTML(html: string, level: 'rich' | 'minimal' | 'text' | 'iati' = 'minimal') {
  let sanitized: string;
  
  switch (level) {
    case 'rich':
      sanitized = sanitizeRichText(html);
      break;
    case 'text':
      sanitized = sanitizeTextOnly(html);
      break;
    case 'iati':
      sanitized = sanitizeIatiDescription(html);
      break;
    default:
      sanitized = sanitizeMinimal(html);
  }
  
  return { __html: sanitized };
}

/**
 * Server-safe IATI description sanitization
 * Uses regex-based sanitization that works in serverless environments
 * without requiring jsdom/canvas dependencies
 * 
 * This is a fallback for API routes where DOMPurify may not work
 */
export function sanitizeIatiDescriptionServerSafe(html: string): string {
  if (!html) return '';
  
  // Decode common HTML entities
  let decoded = html
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  // Remove dangerous tags (script, style, iframe, object, embed, form, input)
  decoded = decoded.replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '');
  decoded = decoded.replace(/<\s*style[^>]*>[\s\S]*?<\s*\/\s*style\s*>/gi, '');
  decoded = decoded.replace(/<\s*iframe[^>]*>[\s\S]*?<\s*\/\s*iframe\s*>/gi, '');
  decoded = decoded.replace(/<\s*object[^>]*>[\s\S]*?<\s*\/\s*object\s*>/gi, '');
  decoded = decoded.replace(/<\s*embed[^>]*\/?>/gi, '');
  decoded = decoded.replace(/<\s*form[^>]*>[\s\S]*?<\s*\/\s*form\s*>/gi, '');
  decoded = decoded.replace(/<\s*input[^>]*\/?>/gi, '');
  decoded = decoded.replace(/<\s*button[^>]*>[\s\S]*?<\s*\/\s*button\s*>/gi, '');
  decoded = decoded.replace(/<\s*textarea[^>]*>[\s\S]*?<\s*\/\s*textarea\s*>/gi, '');
  decoded = decoded.replace(/<\s*select[^>]*>[\s\S]*?<\s*\/\s*select\s*>/gi, '');
  
  // Remove event handlers (onclick, onerror, onload, etc.)
  decoded = decoded.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  decoded = decoded.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, '');
  
  // Remove javascript: and data: URLs from href/src attributes
  decoded = decoded.replace(/href\s*=\s*["']?\s*javascript:[^"'\s>]*/gi, 'href=""');
  decoded = decoded.replace(/src\s*=\s*["']?\s*javascript:[^"'\s>]*/gi, 'src=""');
  decoded = decoded.replace(/href\s*=\s*["']?\s*data:[^"'\s>]*/gi, 'href=""');
  decoded = decoded.replace(/src\s*=\s*["']?\s*data:[^"'\s>]*/gi, 'src=""');
  
  return decoded;
}
