'use client';

import React, { forwardRef } from 'react';
import { sanitizeIatiDescription, sanitizeRichText, sanitizeMinimal, sanitizeTextOnly } from '@/lib/sanitize';
import { cn } from '@/lib/utils';

type SanitizeLevel = 'rich' | 'minimal' | 'text' | 'iati';

interface SafeHtmlProps extends React.HTMLAttributes<HTMLElement> {
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
  /** The HTML element to render as */
  as?: 'div' | 'span' | 'p';
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
  style,
  ...rest
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
  // Using [&_element] to target nested elements, not just direct children
  const baseStyles = cn(
    // Prose-like styling for rendered HTML
    '[&_p]:mb-2 [&_p:last-child]:mb-0',
    '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-2 [&_ul]:ml-0',
    '[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-2 [&_ol]:ml-0',
    '[&_li]:mb-1 [&_li]:pl-1',
    '[&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-2',
    '[&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-2',
    '[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-2',
    '[&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_blockquote]:italic',
    '[&_a]:text-blue-600 [&_a]:underline [&_a]:hover:text-blue-800',
    '[&_strong]:font-semibold [&_b]:font-semibold',
    '[&_em]:italic [&_i]:italic',
    className
  );

  const commonProps = {
    ...rest,
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

