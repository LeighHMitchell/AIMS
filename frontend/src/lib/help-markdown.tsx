/**
 * Minimal, safe markdown renderer for Page Help answers.
 *
 * Supports ONLY: **bold**, *italic*, `[text](url)`, `- ` / `1. ` lists, and
 * paragraph breaks on blank lines. No images, no raw HTML, no headings, no
 * code blocks. Kept deliberately tiny so we avoid a `react-markdown`
 * dependency for a single surface.
 *
 * All rendered links open in a new tab with `rel="noopener noreferrer"`.
 * URLs are constrained to http/https/mailto to prevent `javascript:` abuse.
 */

import React from 'react';

const SAFE_URL_RE = /^(https?:|mailto:)/i;

/** Render inline markdown (bold, italic, links) for a single line of text. */
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let keyCounter = 0;
  let buffer = '';

  const flushBuffer = () => {
    if (buffer) {
      nodes.push(buffer);
      buffer = '';
    }
  };

  while (i < text.length) {
    // Link: [text](url)
    if (text[i] === '[') {
      const closeBracket = text.indexOf(']', i);
      if (closeBracket !== -1 && text[closeBracket + 1] === '(') {
        const closeParen = text.indexOf(')', closeBracket + 2);
        if (closeParen !== -1) {
          const label = text.slice(i + 1, closeBracket);
          const rawUrl = text.slice(closeBracket + 2, closeParen).trim();
          if (SAFE_URL_RE.test(rawUrl)) {
            flushBuffer();
            nodes.push(
              <a
                key={`${keyPrefix}-link-${keyCounter++}`}
                href={rawUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:text-primary/80"
              >
                {renderInline(label, `${keyPrefix}-l${keyCounter}`)}
              </a>
            );
            i = closeParen + 1;
            continue;
          }
        }
      }
    }

    // Bold: **text**
    if (text[i] === '*' && text[i + 1] === '*') {
      const end = text.indexOf('**', i + 2);
      if (end !== -1) {
        flushBuffer();
        nodes.push(
          <strong key={`${keyPrefix}-b-${keyCounter++}`} className="font-semibold">
            {renderInline(text.slice(i + 2, end), `${keyPrefix}-b${keyCounter}`)}
          </strong>
        );
        i = end + 2;
        continue;
      }
    }

    // Italic: *text* (single asterisk, not followed by another)
    if (text[i] === '*' && text[i + 1] !== '*') {
      const end = text.indexOf('*', i + 1);
      if (end !== -1 && text[end - 1] !== ' ' && text[end + 1] !== '*') {
        flushBuffer();
        nodes.push(
          <em key={`${keyPrefix}-i-${keyCounter++}`}>
            {renderInline(text.slice(i + 1, end), `${keyPrefix}-i${keyCounter}`)}
          </em>
        );
        i = end + 1;
        continue;
      }
    }

    buffer += text[i];
    i++;
  }

  flushBuffer();
  return nodes;
}

type Block =
  | { kind: 'p'; lines: string[] }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] };

function parseBlocks(source: string): Block[] {
  const rawLines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let current: Block | null = null;

  const flush = () => {
    if (current) {
      blocks.push(current);
      current = null;
    }
  };

  for (const raw of rawLines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flush();
      continue;
    }
    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    if (ul) {
      if (!current || current.kind !== 'ul') {
        flush();
        current = { kind: 'ul', items: [] };
      }
      current.items.push(ul[1]);
      continue;
    }
    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ol) {
      if (!current || current.kind !== 'ol') {
        flush();
        current = { kind: 'ol', items: [] };
      }
      current.items.push(ol[1]);
      continue;
    }
    if (!current || current.kind !== 'p') {
      flush();
      current = { kind: 'p', lines: [] };
    }
    current.lines.push(line);
  }
  flush();
  return blocks;
}

interface HelpMarkdownProps {
  source: string;
  className?: string;
}

export function HelpMarkdown({ source, className }: HelpMarkdownProps) {
  const blocks = parseBlocks(source);

  return (
    <div className={className}>
      {blocks.map((block, idx) => {
        if (block.kind === 'ul') {
          return (
            <ul key={idx} className="list-disc pl-5 space-y-1 my-2">
              {block.items.map((item, i) => (
                <li key={i}>{renderInline(item, `b${idx}-i${i}`)}</li>
              ))}
            </ul>
          );
        }
        if (block.kind === 'ol') {
          return (
            <ol key={idx} className="list-decimal pl-5 space-y-1 my-2">
              {block.items.map((item, i) => (
                <li key={i}>{renderInline(item, `b${idx}-i${i}`)}</li>
              ))}
            </ol>
          );
        }
        return (
          <p key={idx} className="my-2 first:mt-0 last:mb-0">
            {block.lines.map((line, i) => (
              <React.Fragment key={i}>
                {i > 0 && <br />}
                {renderInline(line, `b${idx}-l${i}`)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
