"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Search,
  ChevronDown,
  ChevronUp,
  BookOpen,
  ChevronsUpDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip'
import { LoadingText } from '@/components/ui/loading-text'
import { apiFetch } from '@/lib/api-fetch'
import { GLOSSARY_TERMS, type GlossaryTerm } from '@/lib/glossary-terms'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

// Renders `backtick` spans in definition text as inline code
// (monospace on a grey background), leaving the rest as plain text.
function renderDefinition(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`)/g)
  return parts.map((part, index) =>
    part.startsWith('`') && part.endsWith('`') ? (
      <code
        key={index}
        className="font-mono text-[0.85em] bg-muted text-foreground px-1 py-0.5 rounded"
      >
        {part.slice(1, -1)}
      </code>
    ) : (
      <React.Fragment key={index}>{part}</React.Fragment>
    )
  )
}

export default function GlossaryPage() {
  const [terms, setTerms] = useState<GlossaryTerm[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [expandedTerms, setExpandedTerms] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        const response = await apiFetch('/api/glossary')
        if (!response.ok) throw new Error('Failed to fetch glossary terms')
        const rows: Array<{
          id: string
          term: string
          category: string
          simple_definition: string
          detailed_definition: string
        }> = await response.json()
        setTerms(rows.map(row => ({
          id: row.id,
          term: row.term,
          category: row.category,
          simple: row.simple_definition,
          detailed: row.detailed_definition,
        })))
      } catch {
        // Fall back to the built-in term list if the API is unavailable
        // (e.g., the glossary_terms migration has not been applied yet).
        setTerms(GLOSSARY_TERMS)
      } finally {
        setLoading(false)
      }
    }
    fetchTerms()
  }, [])

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(terms.map(t => t.category))).sort()],
    [terms]
  )

  const filteredTerms = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return terms
      .filter(entry => {
        const matchesSearch =
          !query ||
          entry.term.toLowerCase().includes(query) ||
          entry.simple.toLowerCase().includes(query) ||
          entry.detailed.toLowerCase().includes(query)
        const matchesCategory = selectedCategory === 'All' || entry.category === selectedCategory
        return matchesSearch && matchesCategory
      })
      .sort((a, b) => a.term.localeCompare(b.term))
  }, [terms, searchTerm, selectedCategory])

  // Group filtered terms by first letter for the A–Z sections
  const groupedTerms = useMemo(() => {
    const groups = new Map<string, typeof filteredTerms>()
    for (const entry of filteredTerms) {
      const letter = entry.term[0].toUpperCase()
      if (!groups.has(letter)) groups.set(letter, [])
      groups.get(letter)!.push(entry)
    }
    return groups
  }, [filteredTerms])

  const activeLetters = new Set(groupedTerms.keys())

  const toggleExpanded = (id: string) => {
    setExpandedTerms(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const scrollToLetter = (letter: string) => {
    document.getElementById(`glossary-${letter}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b bg-card">
          <div className="flex items-center justify-between p-6">
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-3xl font-bold text-foreground">Glossary</h1>
                <HelpTextTooltip content="A reference of the terms and phrases used throughout the system. Each entry has a plain-language definition; expand it for the more detailed, technical explanation." />
              </div>
              <p className="text-muted-foreground mt-1">
                {loading ? 'Terms' : `${terms.length} terms`} and phrases used across the aid management system, explained simply and in detail
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search terms and definitions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-body ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/50 transition-colors appearance-none pr-8 min-w-[200px]"
              >
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <ChevronsUpDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 shrink-0 opacity-50 pointer-events-none" />
            </div>
          </div>

          {/* A–Z jump bar */}
          <div className="flex flex-wrap gap-1">
            {ALPHABET.map(letter => {
              const enabled = activeLetters.has(letter)
              return (
                <button
                  key={letter}
                  onClick={() => enabled && scrollToLetter(letter)}
                  disabled={!enabled}
                  className={cn(
                    'h-8 w-8 text-body font-medium rounded-md transition-colors',
                    enabled
                      ? 'text-foreground hover:bg-accent'
                      : 'text-muted-foreground/40 cursor-default'
                  )}
                >
                  {letter}
                </button>
              )
            })}
          </div>

          {/* Term list */}
          {loading ? (
            <Card>
              <CardContent className="p-12 text-center">
                <LoadingText>Loading glossary...</LoadingText>
              </CardContent>
            </Card>
          ) : filteredTerms.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No terms found</h3>
                <p className="text-muted-foreground">
                  Try a different search term or choose another category.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {Array.from(groupedTerms.entries()).map(([letter, terms]) => (
                <section key={letter} id={`glossary-${letter}`} className="scroll-mt-6">
                  <h2 className="text-xl font-semibold text-muted-foreground border-b pb-2 mb-4">{letter}</h2>
                  <div className="space-y-3">
                    {terms.map(entry => {
                      const isExpanded = expandedTerms.has(entry.id)
                      return (
                        <Card key={entry.id} className="overflow-hidden">
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-lg font-semibold text-foreground">{entry.term}</h3>
                                  <Badge variant="secondary">{entry.category}</Badge>
                                </div>
                                <p className="text-foreground leading-relaxed mt-2">{renderDefinition(entry.simple)}</p>

                                {isExpanded && (
                                  <div className="mt-3 pt-3 border-t">
                                    <p className="text-helper font-medium text-muted-foreground uppercase mb-1">
                                      In more detail
                                    </p>
                                    <p className="text-body text-foreground leading-relaxed">{renderDefinition(entry.detailed)}</p>
                                  </div>
                                )}

                                <button
                                  onClick={() => toggleExpanded(entry.id)}
                                  className="mt-2 text-body text-muted-foreground hover:text-foreground flex items-center gap-1"
                                >
                                  {isExpanded ? (
                                    <>
                                      <ChevronUp className="h-4 w-4" />
                                      Hide detail
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="h-4 w-4" />
                                      More detail
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}

          {/* Help Text */}
          <Card className="bg-muted/30 border-muted">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <BookOpen className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <h3 className="font-medium text-foreground mb-1">Missing a term?</h3>
                  <p className="text-body text-muted-foreground">
                    If a term you encountered in the system is not listed here, check the FAQ or submit feedback through the User Menu so it can be added.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}
