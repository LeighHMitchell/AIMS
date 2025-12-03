'use client';

import React, { forwardRef } from 'react';
import { sanitizeIatiDescription, sanitizeRichText, sanitizeMinimal, sanitizeTextOnly } from '@/lib/sanitize';
import { cn } from '@/lib/utils';

type SanitizeLevel = 'rich' | 'minimal' | 'text' | 'iati';

interface SafeHtmlProps {
  /** The HTML string to sanitize and render */
  html: string;
  /** 
   * The sanitization level to apply:
   * - 'iati': For IATI descriptions (allows common formatting)
   * - 'rich': For rich text with links
   * - 'minimal': Only bold, italic, line breaks
   * - 'text': Strips all HTML
   */
  level?: SanitizeLevel;
  /** Additional CSS classes */
  className?: string;
  /** The HTML element to render as */
  as?: 'div' | 'span' | 'p';
  /** Inline styles */
  style?: React.CSSProperties;
}

/**
 * SafeHtml component for rendering sanitized HTML content
 * Uses DOMPurify to sanitize HTML before rendering with dangerouslySetInnerHTML
 * Supports ref forwarding for use with asChild in Radix UI components
 */
export const SafeHtml = forwardRef<HTMLElement, SafeHtmlProps>(({ 
  html, 
  level = 'iati', 
  className,
  as = 'div',
  style
}, ref) => {
  if (!html) return null;

  let sanitized: string;
  switch (level) {
    case 'rich':
      sanitized = sanitizeRichText(html);
      break;
    case 'minimal':
      sanitized = sanitizeMinimal(html);
      break;
    case 'text':
      sanitized = sanitizeTextOnly(html);
      break;
    case 'iati':
    default:
      sanitized = sanitizeIatiDescription(html);
      break;
  }

  // Base styles for HTML content rendering
  const baseStyles = cn(
    // Prose-like styling for rendered HTML
    '[&>p]:mb-2 [&>p:last-child]:mb-0',
    '[&>ul]:list-disc [&>ul]:ml-4 [&>ul]:mb-2',
    '[&>ol]:list-decimal [&>ol]:ml-4 [&>ol]:mb-2',
    '[&>li]:mb-1',
    '[&>h1]:text-xl [&>h1]:font-bold [&>h1]:mb-2',
    '[&>h2]:text-lg [&>h2]:font-bold [&>h2]:mb-2',
    '[&>h3]:text-base [&>h3]:font-semibold [&>h3]:mb-2',
    '[&>blockquote]:border-l-4 [&>blockquote]:border-slate-300 [&>blockquote]:pl-4 [&>blockquote]:italic',
    '[&>a]:text-blue-600 [&>a]:underline [&>a]:hover:text-blue-800',
    className
  );

  const commonProps = {
    className: baseStyles,
    style,
    dangerouslySetInnerHTML: { __html: sanitized }
  };

  if (as === 'span') {
    return <span ref={ref as React.Ref<HTMLSpanElement>} {...commonProps} />;
  }
  if (as === 'p') {
    return <p ref={ref as React.Ref<HTMLParagraphElement>} {...commonProps} />;
  }
  return <div ref={ref as React.Ref<HTMLDivElement>} {...commonProps} />;
});

SafeHtml.displayName = 'SafeHtml';

export default SafeHtml;

