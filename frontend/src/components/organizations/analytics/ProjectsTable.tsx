"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ProjectTableData {
  id: string;
  title: string;
  iati_identifier: string;
  status: string;
  sectors: string;
  developmentPartners: string;
  executingAgencies: string;
  commitments: number;
  disbursements: number;
  orgRole: string;
}

interface ProjectsTableProps {
  projects: ProjectTableData[];
  currency?: string;
}

type SortField = 'title' | 'iati_identifier' | 'status' | 'sectors' | 'commitments' | 'disbursements';
type SortDirection = 'asc' | 'desc';

const STATUS_LABELS: { [key: string]: string } = {
  '1': 'Pipeline',
  '2': 'Active',
  '3': 'Completed',
  '4': 'Post-Completion',
  '5': 'Cancelled',
  'pipeline': 'Pipeline',
  'active': 'Active',
  'completed': 'Completed',
  'cancelled': 'Cancelled',
  'suspended': 'Suspended',
};

const STATUS_COLORS: { [key: string]: string } = {
  '2': 'bg-green-100 text-green-800',
  'active': 'bg-green-100 text-green-800',
  '1': 'bg-blue-100 text-blue-800',
  'pipeline': 'bg-blue-100 text-blue-800',
  '3': 'bg-gray-100 text-gray-800',
  'completed': 'bg-gray-100 text-gray-800',
  '5': 'bg-red-100 text-red-800',
  'cancelled': 'bg-red-100 text-red-800',
};

export function ProjectsTable({ projects, currency = 'USD' }: ProjectsTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-4 w-4 ml-1" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1" />
    );
  };

  const filteredAndSortedProjects = useMemo(() => {
    let filtered = projects;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        project =>
          project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          project.iati_identifier?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by role
    if (roleFilter !== 'all') {
      filtered = filtered.filter(project => project.orgRole === roleFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === 'commitments' || sortField === 'disbursements') {
        aVal = aVal || 0;
        bVal = bVal || 0;
      } else {
        aVal = (aVal || '').toString().toLowerCase();
        bVal = (bVal || '').toString().toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [projects, searchTerm, sortField, sortDirection, roleFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedProjects.length / itemsPerPage);
  const paginatedProjects = filteredAndSortedProjects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleRowClick = (projectId: string) => {
    router.push(`/activities/${projectId}`);
  };

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle className="text-lg font-semibold text-slate-900">
            All Projects ({filteredAndSortedProjects.length})
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search by name or ID..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                <SelectItem value="reporting">Reporting Org</SelectItem>
                <SelectItem value="funding">Funding</SelectItem>
                <SelectItem value="implementing">Implementing</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead
                    className="cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center">
                      Name
                      {getSortIcon('title')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort('iati_identifier')}
                  >
                    <div className="flex items-center">
                      ID
                      {getSortIcon('iati_identifier')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center">
                      Status
                      {getSortIcon('status')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort('sectors')}
                  >
                    <div className="flex items-center">
                      Sector
                      {getSortIcon('sectors')}
                    </div>
                  </TableHead>
                  <TableHead>Development Partners</TableHead>
                  <TableHead>Executing Agency</TableHead>
                  <TableHead
                    className="text-right cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort('commitments')}
                  >
                    <div className="flex items-center justify-end">
                      Commitment
                      {getSortIcon('commitments')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-right cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort('disbursements')}
                  >
                    <div className="flex items-center justify-end">
                      Disbursement
                      {getSortIcon('disbursements')}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                      No projects found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedProjects.map((project) => (
                    <TableRow
                      key={project.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => handleRowClick(project.id)}
                    >
                      <TableCell className="font-medium max-w-xs">
                        <div className="truncate" title={project.title}>
                          {project.title}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {project.iati_identifier || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            STATUS_COLORS[project.status] || 'bg-gray-100 text-gray-800'
                          }
                        >
                          {STATUS_LABELS[project.status] || project.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 max-w-xs">
                        <div className="truncate" title={project.sectors}>
                          {project.sectors || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 max-w-xs">
                        <div className="truncate" title={project.developmentPartners}>
                          {project.developmentPartners || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 max-w-xs">
                        <div className="truncate" title={project.executingAgencies}>
                          {project.executingAgencies || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {formatCurrency(project.commitments)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {formatCurrency(project.disbursements)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-slate-600">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredAndSortedProjects.length)} of{' '}
              {filteredAndSortedProjects.length} projects
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

