"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getRoleDisplayLabel } from '@/lib/role-badge-utils';
import { Users, Search, X, LayoutGrid, Table2, Mail, Phone, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { PersonCard } from '@/components/rolodex/PersonCard';
import { apiFetch } from '@/lib/api-fetch';
import type { RolodexPerson } from '@/app/api/rolodex/route';

interface MyTeamTabProps {
  organizationId: string;
}

export function MyTeamTab({ organizationId }: MyTeamTabProps) {
  const [people, setPeople] = useState<RolodexPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [sortColumn, setSortColumn] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          organization: organizationId,
          limit: '200',
          sortBy: 'name',
          sortOrder: 'asc',
        });

        const response = await apiFetch(`/api/rolodex?${params}`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch team members');
        }

        const data = await response.json();
        setPeople(data.people || []);
      } catch (err) {
        console.error('[MyTeamTab] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load team');
      } finally {
        setLoading(false);
      }
    };

    if (organizationId) {
      fetchTeam();
    }
  }, [organizationId]);

  const filteredPeople = useMemo(() => {
    if (!searchQuery.trim()) return people;
    const q = searchQuery.toLowerCase();
    return people.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.job_title?.toLowerCase().includes(q) ||
      p.department?.toLowerCase().includes(q) ||
      p.position?.toLowerCase().includes(q) ||
      p.role_label?.toLowerCase().includes(q)
    );
  }, [people, searchQuery]);

  const sortedPeople = useMemo(() => {
    const sorted = [...filteredPeople].sort((a, b) => {
      const getValue = (p: RolodexPerson): string => {
        switch (sortColumn) {
          case 'name': return p.name || '';
          case 'role': return getRoleDisplayLabel(p.role) || '';
          case 'position': return p.job_title || p.position || '';
          case 'department': return p.department || '';
          case 'email': return p.email || '';
          case 'phone': return p.phone || '';
          case 'source': return p.source || '';
          default: return '';
        }
      };
      const aVal = getValue(a).toLowerCase();
      const bVal = getValue(b).toLowerCase();
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredPeople, sortColumn, sortDirection]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) return <ChevronsUpDown className="h-3.5 w-3.5 ml-1 text-muted-foreground/50" />;
    return sortDirection === 'asc'
      ? <ChevronUp className="h-3.5 w-3.5 ml-1" />
      : <ChevronDown className="h-3.5 w-3.5 ml-1" />;
  };

  const handleRefetch = () => {
    setLoading(true);
    const params = new URLSearchParams({
      organization: organizationId,
      limit: '200',
      sortBy: 'name',
      sortOrder: 'asc',
    });
    apiFetch(`/api/rolodex?${params}`)
      .then(res => res.json())
      .then(data => setPeople(data.people || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  if (loading) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            My Team
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-[220px] w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            My Team
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-body text-destructive">Failed to load team: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            My Team
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="relative w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-body"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>

            <Button
              variant="outline"
              size="icon"
              title="Card view"
              onClick={() => setViewMode('card')}
              className={`h-9 w-9 rounded-r-none ${viewMode === 'card' ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              title="Table view"
              onClick={() => setViewMode('table')}
              className={`h-9 w-9 rounded-l-none border-l-0 ${viewMode === 'table' ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}
            >
              <Table2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredPeople.length === 0 ? (
          <EmptyState
            illustration="/images/empty-badges.webp"
            title={searchQuery ? 'No team members match your search' : 'No team members found'}
            message={searchQuery ? 'Try adjusting your search terms.' : 'There are no team members to display.'}
          />
        ) : viewMode === 'card' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredPeople.map((person) => (
              <PersonCard
                key={`${person.source}-${person.id}`}
                person={person}
                onDelete={handleRefetch}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {[
                    { key: 'name', label: 'Name', className: 'w-[280px]' },
                    { key: 'role', label: 'Role' },
                    { key: 'position', label: 'Position' },
                    { key: 'department', label: 'Department' },
                    { key: 'email', label: 'Email' },
                    { key: 'phone', label: 'Phone' },
                  ].map(col => (
                    <TableHead
                      key={col.key}
                      className={`cursor-pointer select-none hover:text-foreground ${col.className || ''}`}
                      onClick={() => handleSort(col.key)}
                    >
                      <span className="inline-flex items-center">
                        {col.label}
                        <SortIcon column={col.key} />
                      </span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPeople.map((person) => {
                  const initials = person.name
                    ? person.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
                    : 'U';
                  return (
                    <TableRow key={`${person.source}-${person.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            {person.profile_photo && (
                              <AvatarImage src={person.profile_photo} alt={person.name} />
                            )}
                            <AvatarFallback className="text-helper">{initials}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-body">{person.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-body text-muted-foreground">
                        {person.role ? getRoleDisplayLabel(person.role) : '—'}
                      </TableCell>
                      <TableCell className="text-body text-muted-foreground">
                        {person.job_title || person.position || '—'}
                      </TableCell>
                      <TableCell className="text-body text-muted-foreground">
                        {person.department || '—'}
                      </TableCell>
                      <TableCell>
                        {person.email ? (
                          <a href={`mailto:${person.email}`} className="text-body text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5" />
                            {person.email}
                          </a>
                        ) : (
                          <span className="text-body text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {person.phone ? (
                          <span className="text-body text-muted-foreground inline-flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5" />
                            {person.phone}
                          </span>
                        ) : (
                          <span className="text-body text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
