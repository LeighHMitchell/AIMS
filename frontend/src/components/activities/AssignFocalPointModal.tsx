'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2, Users, Loader2, Search } from 'lucide-react';
import { FocalPointType } from '@/types/focal-points';
import { apiFetch } from '@/lib/api-fetch';

export interface UserOption {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  organizationId?: string;
  organization?: string;
  jobTitle?: string;
  department?: string;
  value: string;
  label: string;
}

interface AssignFocalPointModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (type: FocalPointType) => void;
  selectedUser: UserOption | null;
  onSelectedUserChange: (userId: string | null, userData: UserOption | null) => void;
  actionLoading: string | null;
  fixedType?: FocalPointType;
}

export function AssignFocalPointModal({
  isOpen,
  onClose,
  onAssign,
  selectedUser,
  onSelectedUserChange,
  actionLoading,
  fixedType
}: AssignFocalPointModalProps) {
  const typeLabel = fixedType === 'government_focal_point'
    ? 'Government Focal Point'
    : fixedType === 'development_partner_focal_point'
      ? 'Development Partner Focal Point'
      : null;
  const TypeIcon = fixedType === 'development_partner_focal_point' ? Users : Building2;
  const [query, setQuery] = useState('');
  const [allResults, setAllResults] = useState<UserOption[]>([]);
  const [filteredResults, setFilteredResults] = useState<UserOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<NodeJS.Timeout>();

  const fetchUsers = useCallback(async (searchQuery: string = '') => {
    setIsSearching(true);
    try {
      const params = searchQuery.length >= 2 ? `?q=${encodeURIComponent(searchQuery)}` : '?limit=20';
      const response = await apiFetch(`/api/users/search${params}`);
      if (response.ok) {
        const data = await response.json();
        setAllResults(data);
        setFilteredResults(data);
        setShowResults(true);
        setHasLoaded(true);
      }
    } catch (error) {
      console.error('[User Search] Error:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleFocus = useCallback(() => {
    if (!hasLoaded) {
      fetchUsers('');
    } else {
      setShowResults(true);
    }
  }, [hasLoaded, fetchUsers]);

  useEffect(() => {
    if (!hasLoaded) return;

    if (query.length === 0) {
      fetchUsers('');
      return;
    }

    if (query.length === 1) {
      const q = query.toLowerCase();
      setFilteredResults(
        allResults.filter((r) => {
          const name = r.name?.toLowerCase() || '';
          const email = r.email?.toLowerCase() || '';
          const org = r.organization?.toLowerCase() || '';
          return name.includes(q) || email.includes(q) || org.includes(q);
        })
      );
      return;
    }

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchUsers(query), 300);

    // Immediate client-side filter
    const q = query.toLowerCase();
    setFilteredResults(
      allResults.filter((r) => {
        const name = r.name?.toLowerCase() || '';
        const email = r.email?.toLowerCase() || '';
        const org = r.organization?.toLowerCase() || '';
        return name.includes(q) || email.includes(q) || org.includes(q);
      })
    );

    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [query, hasLoaded, allResults, fetchUsers]);

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

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setAllResults([]);
      setFilteredResults([]);
      setShowResults(false);
      setHasLoaded(false);
    }
  }, [isOpen]);

  const handleSelect = (user: UserOption) => {
    onSelectedUserChange(user.id, user);
    setQuery('');
    setShowResults(false);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{typeLabel ? `Assign ${typeLabel}` : 'Assign Focal Point'}</DialogTitle>
          <DialogDescription>
            {typeLabel
              ? `Search for a user and assign them as a ${typeLabel.toLowerCase()}.`
              : 'Search for a user and assign them as a government or development partner focal point.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div ref={containerRef}>
            <label className="text-body font-medium mb-2 block">Select User</label>

            {selectedUser ? (
              <div className="flex items-center gap-3 p-3 border border-input rounded-md bg-background">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  {selectedUser.avatarUrl && (
                    <AvatarImage src={selectedUser.avatarUrl} alt={selectedUser.name} />
                  )}
                  <AvatarFallback className="bg-muted text-helper">
                    {getInitials(selectedUser.firstName, selectedUser.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-body truncate">{selectedUser.name}</p>
                  {(selectedUser.jobTitle || selectedUser.department) && (
                    <p className="text-helper text-muted-foreground truncate">
                      {[selectedUser.jobTitle, selectedUser.department].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  {selectedUser.organization && (
                    <p className="text-helper text-muted-foreground truncate">{selectedUser.organization}</p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectedUserChange(null, null)}
                  className="bg-white"
                >
                  Change
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by name or email..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={handleFocus}
                  className="pl-10"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
                )}
              </div>
            )}

            {/* Search Results Dropdown */}
            {showResults && filteredResults.length > 0 && !selectedUser && (
              <div className="mt-2 bg-white border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                <div className="p-2">
                  <p className="text-helper text-muted-foreground px-2 py-1">
                    {query
                      ? `Found ${filteredResults.length} user${filteredResults.length !== 1 ? 's' : ''}`
                      : `${filteredResults.length} user${filteredResults.length !== 1 ? 's' : ''} — type to filter`}
                  </p>
                  {filteredResults.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleSelect(user)}
                      className="w-full text-left px-3 py-3 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          {user.avatarUrl && (
                            <AvatarImage src={user.avatarUrl} alt={user.name} />
                          )}
                          <AvatarFallback className="bg-muted">
                            <span className="text-body font-medium text-muted-foreground">
                              {getInitials(user.firstName, user.lastName)}
                            </span>
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">{user.name}</p>
                          {(user.jobTitle || user.department) && (
                            <p className="text-helper text-muted-foreground truncate">
                              {[user.jobTitle, user.department].filter(Boolean).join(' · ')}
                            </p>
                          )}
                          {user.organization && (
                            <p className="text-helper text-muted-foreground truncate">{user.organization}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showResults && filteredResults.length === 0 && !isSearching && !selectedUser && (
              <div className="mt-2 bg-white border border-border rounded-lg shadow-lg p-4">
                <p className="text-body text-muted-foreground text-center">No users found matching &quot;{query}&quot;</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-row gap-2">
          {fixedType ? (
            <Button
              className="flex-1 py-3 px-4 h-auto"
              onClick={() => onAssign(fixedType)}
              disabled={!selectedUser || actionLoading !== null}
            >
              {actionLoading === `assign-${fixedType}` ? (
                <Loader2 className="h-8 w-8 mr-2 animate-spin" />
              ) : (
                <TypeIcon className="h-8 w-8 mr-2" />
              )}
              <span className="whitespace-normal text-center leading-tight">Assign as {typeLabel}</span>
            </Button>
          ) : (
            <>
              <Button
                className="flex-1 py-3 px-4 h-auto"
                onClick={() => onAssign('government_focal_point')}
                disabled={!selectedUser || actionLoading !== null}
              >
                {actionLoading === 'assign-government_focal_point' ? (
                  <Loader2 className="h-8 w-8 mr-2 animate-spin" />
                ) : (
                  <Building2 className="h-8 w-8 mr-2" />
                )}
                <span className="whitespace-normal text-center leading-tight">Assign as Government Focal Point</span>
              </Button>
              <Button
                className="flex-1 py-3 px-4 h-auto"
                variant="outline"
                onClick={() => onAssign('development_partner_focal_point')}
                disabled={!selectedUser || actionLoading !== null}
              >
                {actionLoading === 'assign-development_partner_focal_point' ? (
                  <Loader2 className="h-8 w-8 mr-2 animate-spin" />
                ) : (
                  <Users className="h-8 w-8 mr-2" />
                )}
                <span className="whitespace-normal text-center leading-tight">Assign as Development Partner Focal Point</span>
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
