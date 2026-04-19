'use client';

import { RequiredDot } from "@/components/ui/required-dot";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowRight, Loader2, AlertCircle, Search } from 'lucide-react';
import { FocalPointHandoffModalProps } from '@/types/focal-points';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserOption } from './AssignFocalPointModal';
import { apiFetch } from '@/lib/api-fetch';

export function FocalPointHandoffModal({
  isOpen,
  onClose,
  onConfirm,
  currentFocalPointName,
  type,
}: FocalPointHandoffModalProps) {
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [query, setQuery] = useState('');
  const [allResults, setAllResults] = useState<UserOption[]>([]);
  const [filteredResults, setFilteredResults] = useState<UserOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<NodeJS.Timeout>();

  const typeLabel = type === 'government_focal_point'
    ? 'Government Focal Point'
    : 'Development Partner Focal Point';

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
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleFocus = useCallback(() => {
    if (!hasLoaded) fetchUsers('');
    else setShowResults(true);
  }, [hasLoaded, fetchUsers]);

  useEffect(() => {
    if (!hasLoaded) return;
    if (query.length === 0) {
      fetchUsers('');
      return;
    }
    if (query.length === 1) {
      const q = query.toLowerCase();
      setFilteredResults(allResults.filter((r) => {
        return (r.name || '').toLowerCase().includes(q)
          || (r.email || '').toLowerCase().includes(q)
          || (r.organization || '').toLowerCase().includes(q);
      }));
      return;
    }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchUsers(query), 300);
    const q = query.toLowerCase();
    setFilteredResults(allResults.filter((r) => {
      return (r.name || '').toLowerCase().includes(q)
        || (r.email || '').toLowerCase().includes(q)
        || (r.organization || '').toLowerCase().includes(q);
    }));
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [query, hasLoaded, allResults, fetchUsers]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setAllResults([]);
      setFilteredResults([]);
      setShowResults(false);
      setHasLoaded(false);
      setSelectedUser(null);
    }
  }, [isOpen]);

  const handleSelect = (user: UserOption) => {
    setSelectedUser(user);
    setQuery('');
    setShowResults(false);
  };

  const getInitials = (firstName: string, lastName: string) =>
    `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();

  const handleConfirm = async () => {
    if (!selectedUser) return;
    
    setIsSubmitting(true);
    try {
      await onConfirm(selectedUser.id);
      setSelectedUser(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedUser(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Handoff Focal Point Role
          </DialogTitle>
          <DialogDescription>
            Transfer your {typeLabel} responsibility to another user.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="default" className="bg-muted border-border">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            <AlertDescription className="text-foreground">
              You are currently the <strong>{typeLabel}</strong> for this activity.
              Select a user to transfer this role to. They will receive a notification
              and must accept the handoff before becoming the new focal point.
            </AlertDescription>
          </Alert>

          <div ref={containerRef}>
            <label className="text-body font-medium mb-2 block">
              Select User to Handoff To <RequiredDot />
            </label>

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
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="text-muted-foreground hover:text-foreground text-body"
                  disabled={isSubmitting}
                >
                  Change
                </button>
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
                  disabled={isSubmitting}
                  className="pl-10"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
                )}
              </div>
            )}

            {showResults && filteredResults.length > 0 && !selectedUser && (
              <div className="mt-2 bg-white border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                <div className="p-2">
                  <p className="text-helper text-muted-foreground px-2 py-1">
                    {query
                      ? `Found ${filteredResults.length} user${filteredResults.length !== 1 ? 's' : ''}`
                      : `${filteredResults.length} user${filteredResults.length !== 1 ? 's' : ''} — type to filter`}
                  </p>
                  {filteredResults.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleSelect(u)}
                      className="w-full text-left px-3 py-3 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          {u.avatarUrl && <AvatarImage src={u.avatarUrl} alt={u.name} />}
                          <AvatarFallback className="bg-muted">
                            <span className="text-body font-medium text-muted-foreground">
                              {getInitials(u.firstName, u.lastName)}
                            </span>
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">{u.name}</p>
                          {(u.jobTitle || u.department) && (
                            <p className="text-helper text-muted-foreground truncate">
                              {[u.jobTitle, u.department].filter(Boolean).join(' · ')}
                            </p>
                          )}
                          {u.organization && (
                            <p className="text-helper text-muted-foreground truncate">{u.organization}</p>
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
                <p className="text-body text-muted-foreground text-center">No users found{query ? ` matching "${query}"` : ''}</p>
              </div>
            )}
          </div>

          {selectedUser && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-body text-muted-foreground">
                <span className="font-medium">{currentFocalPointName}</span>
                {' → '}
                <span className="font-medium text-foreground">{selectedUser.name}</span>
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedUser || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4 mr-2" />
                Initiate Handoff
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


