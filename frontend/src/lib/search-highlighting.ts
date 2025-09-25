/**
 * Search result highlighting utilities
 * Provides functions to highlight search terms in text and generate snippets
 */

interface HighlightOptions {
  maxLength?: number
  highlightClass?: string
  caseSensitive?: boolean
  wholeWords?: boolean
}

interface SnippetOptions {
  maxLength?: number
  highlightTerms?: string[]
  highlightClass?: string
  suffix?: string
}

/**
 * Highlight search terms in text
 */
export function highlightText(
  text: string,
  searchTerms: string[],
  options: HighlightOptions = {}
): string {
  if (!text || !searchTerms.length) {
    return text
  }

  const {
    highlightClass = 'bg-yellow-200 text-yellow-800 font-medium px-0.5 rounded',
    caseSensitive = false,
    wholeWords = true,
    maxLength
  } = options

  let highlightedText = text

  // Truncate if maxLength is specified
  if (maxLength && highlightedText.length > maxLength) {
    highlightedText = highlightedText.substring(0, maxLength)
  }

  // Process each search term
  searchTerms.forEach(term => {
    if (!term.trim()) return

    const regexFlags = caseSensitive ? 'g' : 'gi'
    const escapedTerm = escapeRegex(term.trim())

    if (wholeWords) {
      // Match whole words only
      const wordRegex = new RegExp(`\\b${escapedTerm}\\b`, regexFlags)
      highlightedText = highlightedText.replace(wordRegex, `<mark class="${highlightClass}">$&</mark>`)
    } else {
      // Match anywhere in text
      const anyRegex = new RegExp(escapedTerm, regexFlags)
      highlightedText = highlightedText.replace(anyRegex, `<mark class="${highlightClass}">$&</mark>`)
    }
  })

  return highlightedText
}

/**
 * Generate a snippet with highlighted search terms
 */
export function generateSnippet(
  text: string,
  searchTerms: string[],
  options: SnippetOptions = {}
): string {
  if (!text || !searchTerms.length) {
    return text
  }

  const {
    maxLength = 150,
    highlightTerms = searchTerms,
    highlightClass = 'bg-yellow-200 text-yellow-800 font-medium px-0.5 rounded',
    suffix = '...'
  } = options

  let snippet = text

  // If text is longer than maxLength, try to find a good snippet
  if (snippet.length > maxLength) {
    // Try to find the first occurrence of any search term
    const firstTerm = searchTerms.find(term => term.trim()) || ''
    if (firstTerm) {
      const termIndex = text.toLowerCase().indexOf(firstTerm.toLowerCase())
      if (termIndex !== -1) {
        // Extract a snippet around the search term
        const start = Math.max(0, termIndex - Math.floor(maxLength / 2))
        const end = Math.min(text.length, start + maxLength)

        snippet = text.substring(start, end)

        // Adjust start to avoid cutting words
        if (start > 0) {
          const wordsBefore = text.substring(0, start).split(/\s+/)
          if (wordsBefore.length > 0) {
            const lastWord = wordsBefore[wordsBefore.length - 1]
            const adjustedStart = text.lastIndexOf(lastWord, start)
            snippet = text.substring(adjustedStart, end)
          }
        }
      }
    } else {
      // No search terms found, just truncate
      snippet = text.substring(0, maxLength)
    }

    // Add suffix if truncated
    if (snippet.length < text.length) {
      snippet += suffix
    }
  }

  // Highlight search terms in the snippet
  return highlightText(snippet, highlightTerms, { highlightClass, maxLength: undefined })
}

/**
 * Highlight search terms in search results
 */
export function highlightSearchResults<T extends { title: string; subtitle?: string }>(
  results: T[],
  searchTerms: string[]
): T[] {
  return results.map(result => ({
    ...result,
    title: highlightText(result.title, searchTerms),
    subtitle: result.subtitle ? highlightText(result.subtitle, searchTerms) : undefined
  }))
}

/**
 * Extract search terms from query string
 */
export function extractSearchTerms(query: string): string[] {
  if (!query) return []

  return query
    .split(/\s+/)
    .map(term => term.trim())
    .filter(term => term.length > 0)
    .filter(term => !/^(and|or|not|the|a|an|in|on|at|to|for|of|with|by|from)$/.test(term.toLowerCase())) // Filter common stopwords
}

/**
 * Escape special regex characters
 */
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Clean HTML from text (remove tags)
 */
export function stripHtml(text: string): string {
  if (!text) return ''
  return text.replace(/<[^>]*>/g, '')
}

/**
 * Get text preview with smart truncation
 */
export function getTextPreview(
  text: string,
  maxLength: number = 100,
  suffix: string = '...'
): string {
  if (!text || text.length <= maxLength) {
    return text
  }

  // Try to break at word boundary
  const truncated = text.substring(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')

  if (lastSpace > maxLength * 0.8) {
    return text.substring(0, lastSpace) + suffix
  }

  return truncated + suffix
}

/**
 * Create search result metadata with highlighting
 */
export function createHighlightedMetadata(
  metadata: Record<string, any>,
  searchTerms: string[]
): Record<string, any> {
  const highlighted: Record<string, any> = {}

  Object.entries(metadata).forEach(([key, value]) => {
    if (typeof value === 'string') {
      highlighted[key] = highlightText(value, searchTerms)
    } else {
      highlighted[key] = value
    }
  })

  return highlighted
}
