/**
 * Server-safe HTML Sanitization Utility
 * Uses regex-based sanitization that works in serverless environments
 * without requiring jsdom/canvas dependencies
 * 
 * Use this in API routes instead of the DOMPurify-based sanitize.ts
 */

/**
 * Server-safe IATI description sanitization
 * Preserves safe formatting while removing dangerous content
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

