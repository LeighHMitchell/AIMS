'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface SearchResult {
  id: string;
  title?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  countryCode?: string;
  organisation?: string;
  organisationId?: string;
  organisationAcronym?: string;
  position?: string;
  jobTitle?: string;
  department?: string;
  type?: string;
  profilePhoto?: string;
  source: 'contact';
  label: string;
}

interface ContactSearchBarProps {
  onSelect: (result: SearchResult) => void;
  onCreateNew: () => void;
}

export default function ContactSearchBar({ onSelect, onCreateNew }: ContactSearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    // Clear previous timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    // Set new timeout
    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`/api/contacts/search?q=${encodeURIComponent(query)}&limit=10`);
        if (response.ok) {
          const data = await response.json();
          setResults(data);
          setShowResults(true);
        }
      } catch (error) {
        console.error('[Contact Search] Error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [query]);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (result: SearchResult) => {
    onSelect(result);
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search existing contacts by name, email, or organization..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
          )}
        </div>
        <Button type="button" variant="outline" onClick={onCreateNew}>
          Create New Contact
        </Button>
      </div>

      {/* Search Results Dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          <div className="p-2">
            <p className="text-xs text-gray-500 px-2 py-1">
              Found {results.length} contact{results.length !== 1 ? 's' : ''}
            </p>
            {results.map((result) => {
              const fullName = [result.title, result.firstName, result.lastName].filter(Boolean).join(' ');
              const jobLine = [result.jobTitle, result.department].filter(Boolean).join(' • ');
              const orgDisplay = result.organisationAcronym 
                ? `${result.organisation} (${result.organisationAcronym})`
                : result.organisation;
              const phoneDisplay = result.countryCode && result.phone
                ? `${result.countryCode} ${result.phone}`
                : result.phone;

              const getInitials = (firstName: string, lastName: string) => {
                return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
              };

              return (
                <button
                  key={`${result.source}-${result.id}`}
                  type="button"
                  onClick={() => handleSelect(result)}
                  className="w-full text-left px-3 py-3 hover:bg-blue-50 rounded-md transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Profile Photo */}
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      {result.profilePhoto ? (
                        <AvatarImage src={result.profilePhoto} alt={fullName} />
                      ) : (
                        <AvatarFallback className="bg-slate-100">
                          <span className="text-sm font-medium text-slate-600">
                            {getInitials(result.firstName, result.lastName)}
                          </span>
                        </AvatarFallback>
                      )}
                    </Avatar>

                    {/* Contact Details */}
                    <div className="flex-1 min-w-0">
                      {/* Name */}
                      <p className="font-semibold text-gray-900 truncate">
                        {fullName}
                      </p>

                      {/* Job Title & Department */}
                      {jobLine && (
                        <p className="text-sm text-gray-600 truncate">
                          {jobLine}
                        </p>
                      )}

                      {/* Organization */}
                      {orgDisplay && (
                        <p className="text-sm text-gray-600 truncate">
                          {orgDisplay}
                        </p>
                      )}

                      {/* Email and Phone on one line */}
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        {result.email && (
                          <span className="truncate">{result.email}</span>
                        )}
                        {result.email && phoneDisplay && (
                          <span>•</span>
                        )}
                        {phoneDisplay && (
                          <span className="truncate">{phoneDisplay}</span>
                        )}
                      </div>
                    </div>

                    {/* Contact Badge */}
                    <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-600 flex-shrink-0">
                      Contact
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* No Results */}
      {showResults && query.length >= 2 && results.length === 0 && !isSearching && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <p className="text-sm text-gray-600 text-center">
            No contacts found matching &quot;{query}&quot;
          </p>
          <p className="text-xs text-gray-500 text-center mt-2">
            Try a different search or create a new contact
          </p>
        </div>
      )}
    </div>
  );
}

