'use client';

import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronUp, ChevronDown } from 'lucide-react';
// @ts-ignore
import sectorGroupData from '@/data/SectorGroup.json';

interface SectorAllocation {
  id: string;
  code: string;
  name: string;
  percentage: number;
  level?: 'group' | 'sector' | 'subsector';
  category?: string;
  categoryName?: string;
  categoryCode?: string;
  groupName?: string;
}

interface SectorAllocationTableProps {
  allocations: SectorAllocation[];
}

type SortField = 'code' | 'name' | 'categoryCode' | 'categoryName' | 'groupCode' | 'groupName' | 'percentage';
type SortDirection = 'asc' | 'desc';

export default function SectorAllocationTable({ allocations }: SectorAllocationTableProps) {
  const [sortField, setSortField] = useState<SortField>('code');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Enhance allocations with full metadata
  const enhancedAllocations = allocations.map(allocation => {
    const sectorData = sectorGroupData.data.find((s: any) => s.code === allocation.code);
    return {
      ...allocation,
      groupName: sectorData?.['codeforiati:group-name'] || allocation.groupName || 'Unknown',
      groupCode: sectorData?.['codeforiati:group-code'] || allocation.code.substring(0, 2) + '0', // DAC Group code
      categoryName: sectorData?.['codeforiati:category-name'] || allocation.categoryName || 'Unknown',
      categoryCode: sectorData?.['codeforiati:category-code'] || allocation.categoryCode || allocation.code.substring(0, 3)
    };
  });

  // Sort allocations based on current sort field and direction
  const sortedAllocations = useMemo(() => {
    return [...enhancedAllocations].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      // Handle numeric sorting for percentage
      if (sortField === 'percentage') {
        aValue = Number(aValue);
        bValue = Number(bValue);
      }
      
      let comparison = 0;
      if (aValue < bValue) comparison = -1;
      if (aValue > bValue) comparison = 1;
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [enhancedAllocations, sortField, sortDirection]);

  // Handle column header click for sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Render sortable header
  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-gray-50 select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          sortDirection === 'asc' ? 
            <ChevronUp className="h-4 w-4" /> : 
            <ChevronDown className="h-4 w-4" />
        )}
      </div>
    </TableHead>
  );

  const totalPercentage = allocations.reduce((sum, a) => sum + a.percentage, 0);
  const unallocatedPercentage = Math.max(0, 100 - totalPercentage);

  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHeader field="code">Sub-sector Code</SortableHeader>
            <SortableHeader field="name">Sub-sector</SortableHeader>
            <SortableHeader field="categoryCode">Sector Code</SortableHeader>
            <SortableHeader field="categoryName">Sector</SortableHeader>
            <SortableHeader field="groupCode">Sector Category Code</SortableHeader>
            <SortableHeader field="groupName">Sector Category</SortableHeader>
            <TableHead 
              className="text-right cursor-pointer hover:bg-gray-50 select-none"
              onClick={() => handleSort('percentage')}
            >
              <div className="flex items-center justify-end gap-1">
                % Allocation
                {sortField === 'percentage' && (
                  sortDirection === 'asc' ? 
                    <ChevronUp className="h-4 w-4" /> : 
                    <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedAllocations.map((allocation) => (
            <TableRow key={allocation.id} className="h-10">
              {/* Sub-sector Code */}
              <TableCell className="font-mono py-2">
                {allocation.code}
              </TableCell>
              {/* Sub-sector */}
              <TableCell className="py-2">{allocation.name}</TableCell>
              {/* Sector Code */}
              <TableCell className="font-mono py-2">
                {allocation.categoryCode}
              </TableCell>
              {/* Sector */}
              <TableCell className="py-2">
                {allocation.categoryName}
              </TableCell>
              {/* Sector Category Code */}
              <TableCell className="font-mono py-2">
                {allocation.groupCode}
              </TableCell>
              {/* Sector Category */}
              <TableCell className="py-2">
                {allocation.groupName}
              </TableCell>
              <TableCell className="text-right font-mono py-2">
                {allocation.percentage.toFixed(1)}%
              </TableCell>
            </TableRow>
          ))}
          {/* Total row */}
          <TableRow className="border-t-2">
            <TableCell colSpan={6} className="py-2">Total Allocated</TableCell>
            <TableCell className="text-right font-mono py-2">
              {totalPercentage.toFixed(1)}%
            </TableCell>
          </TableRow>
          {/* Unallocated row */}
          {unallocatedPercentage > 0 && (
            <TableRow className="text-gray-500">
              <TableCell colSpan={6} className="py-2">Unallocated</TableCell>
              <TableCell className="text-right font-mono py-2">
                {unallocatedPercentage.toFixed(1)}%
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}