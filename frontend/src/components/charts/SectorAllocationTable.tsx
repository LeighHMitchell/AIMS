'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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

export default function SectorAllocationTable({ allocations }: SectorAllocationTableProps) {
  // Enhance allocations with full metadata
  const enhancedAllocations = allocations.map(allocation => {
    const sectorData = sectorGroupData.data.find((s: any) => s.code === allocation.code);
    return {
      ...allocation,
      groupName: sectorData?.['codeforiati:group-name'] || allocation.groupName || 'Unknown',
      categoryName: sectorData?.['codeforiati:category-name'] || allocation.categoryName || 'Unknown',
      categoryCode: sectorData?.['codeforiati:category-code'] || allocation.categoryCode || allocation.code.substring(0, 3)
    };
  });

  // Sort by group, then category, then code
  const sortedAllocations = [...enhancedAllocations].sort((a, b) => {
    if (a.groupName !== b.groupName) return a.groupName.localeCompare(b.groupName);
    if (a.categoryName !== b.categoryName) return a.categoryName.localeCompare(b.categoryName);
    return a.code.localeCompare(b.code);
  });

  const totalPercentage = allocations.reduce((sum, a) => sum + a.percentage, 0);
  const unallocatedPercentage = Math.max(0, 100 - totalPercentage);

  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sector Code</TableHead>
            <TableHead>Sector Name</TableHead>
            <TableHead>Sector Category</TableHead>
            <TableHead>DAC Group</TableHead>
            <TableHead className="text-right">% Allocation</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedAllocations.map((allocation) => (
            <TableRow key={allocation.id}>
              <TableCell className="font-mono text-sm">
                {allocation.code}
              </TableCell>
              <TableCell>{allocation.name}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs font-mono">
                  {allocation.categoryName}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="text-xs font-mono">
                  {allocation.groupName}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-mono">
                {allocation.percentage.toFixed(1)}%
              </TableCell>
            </TableRow>
          ))}
          {/* Total row */}
          <TableRow className="font-semibold border-t-2">
            <TableCell colSpan={4}>Total Allocated</TableCell>
            <TableCell className="text-right font-mono">
              {totalPercentage.toFixed(1)}%
            </TableCell>
          </TableRow>
          {/* Unallocated row */}
          {unallocatedPercentage > 0 && (
            <TableRow className="text-gray-500">
              <TableCell colSpan={4}>Unallocated</TableCell>
              <TableCell className="text-right font-mono">
                {unallocatedPercentage.toFixed(1)}%
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}