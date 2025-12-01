import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Sector Allocation Tab Skeleton
export function SectorAllocationSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-6 w-48 bg-gray-200 mb-2" />
        <Skeleton className="h-4 w-96 bg-gray-100" />
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
        {/* Add Sector Button */}
        <div className="flex justify-end">
          <Skeleton className="h-10 w-32 bg-gray-100 rounded" />
        </div>
        
        {/* Sector Rows */}
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 rounded">
            <Skeleton className="h-10 w-1/2 bg-gray-100" />
            <Skeleton className="h-10 w-24 bg-gray-100" />
            <Skeleton className="h-8 w-8 bg-gray-100 rounded" />
          </div>
        ))}
        
        {/* Total Percentage */}
        <div className="pt-4 border-t flex justify-end">
          <Skeleton className="h-6 w-32 bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

// Organisations Tab Skeleton
export function OrganisationsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Extending Partners */}
      <div>
        <Skeleton className="h-5 w-40 bg-gray-200 mb-4" />
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex justify-between items-center mb-4">
            <Skeleton className="h-4 w-48 bg-gray-100" />
            <Skeleton className="h-9 w-32 bg-gray-100 rounded" />
          </div>
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 bg-gray-100 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32 bg-gray-200" />
                    <Skeleton className="h-3 w-24 bg-gray-100" />
                  </div>
                </div>
                <Skeleton className="h-8 w-8 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Implementing Partners */}
      <div>
        <Skeleton className="h-5 w-44 bg-gray-200 mb-4" />
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <Skeleton className="h-40 w-full bg-gray-50" />
        </div>
      </div>
    </div>
  );
}

// Finances Tab Skeleton
export function FinancesSkeleton() {
  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-4 border-b">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-32 bg-gray-100" />
        ))}
      </div>
      
      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b flex justify-between items-center">
          <Skeleton className="h-6 w-48 bg-gray-200" />
          <Skeleton className="h-9 w-40 bg-gray-100 rounded" />
        </div>
        
        {/* Table Header */}
        <div className="grid grid-cols-6 gap-4 p-4 bg-gray-50 border-b">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-4 bg-gray-200" />
          ))}
        </div>
        
        {/* Table Rows */}
        {[...Array(4)].map((_, i) => (
          <div key={i} className="grid grid-cols-6 gap-4 p-4 border-b">
            {[...Array(6)].map((_, j) => (
              <Skeleton key={j} className="h-4 bg-gray-100" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Locations Tab Skeleton
export function LocationsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-4 border-b">
        <Skeleton className="h-10 w-40 bg-gray-100" />
        <Skeleton className="h-10 w-40 bg-gray-100" />
      </div>
      
      {/* Map Container */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="h-96 bg-gray-100 relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <Skeleton className="h-12 w-48 bg-gray-200" />
          </div>
        </div>
        
        {/* Location List */}
        <div className="p-4 border-t">
          <div className="flex justify-between items-center mb-4">
            <Skeleton className="h-5 w-32 bg-gray-200" />
            <Skeleton className="h-9 w-32 bg-gray-100 rounded" />
          </div>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-48 bg-gray-200" />
                  <Skeleton className="h-3 w-32 bg-gray-100" />
                </div>
                <Skeleton className="h-8 w-8 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Linked Activities Tab Skeleton
export function LinkedActivitiesSkeleton() {
  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="flex gap-4">
        <Skeleton className="h-10 flex-1 bg-gray-100 rounded" />
        <Skeleton className="h-10 w-32 bg-gray-100 rounded" />
      </div>
      
      {/* View Toggle */}
      <div className="flex justify-end">
        <Skeleton className="h-9 w-24 bg-gray-100 rounded" />
      </div>
      
      {/* Activity Cards */}
      <div className="space-y-4">
        {['Parent', 'Child', 'Sibling'].map((type, i) => (
          <div key={type} className="space-y-3">
            <Skeleton className="h-5 w-32 bg-gray-200" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(2)].map((_, j) => (
                <div key={j} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-3/4 bg-gray-200" />
                      <Skeleton className="h-4 w-full bg-gray-100" />
                      <Skeleton className="h-4 w-2/3 bg-gray-100" />
                    </div>
                    <Skeleton className="h-6 w-16 bg-gray-100 rounded-full" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-20 bg-gray-100 rounded" />
                    <Skeleton className="h-8 w-20 bg-gray-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Generic Content Skeleton for other tabs
export function GenericTabSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 space-y-6">
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-32 bg-gray-100" />
            <Skeleton className="h-10 w-full bg-gray-50 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Transactions Tab Skeleton
export function TransactionsSkeleton() {
  return (
    <div className="space-y-4">
      {/* Table Skeleton */}
      <div className="rounded-md border">
        <div className="p-4 border-b flex justify-between items-center">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-9 w-32 rounded" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                {['Type', 'Date', 'Provider', 'Receiver', 'Amount', 'Currency', 'USD Value', 'Actions'].map((header, i) => (
                  <th key={i} className="p-4 text-left">
                    <Skeleton className="h-4 w-20" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => (
                <tr key={i} className="border-b">
                  {[...Array(8)].map((_, j) => (
                    <td key={j} className="p-4">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Budgets Tab Skeleton
export function BudgetsSkeleton() {
  return (
    <div className="space-y-4">
      {/* Table Skeleton */}
      <div className="rounded-md border">
        <div className="p-4 border-b flex justify-between items-center">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-9 w-40 rounded" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                {['Period', 'Type', 'Status', 'Amount', 'Value Date', 'USD Value', 'Actions'].map((header, i) => (
                  <th key={i} className="p-4 text-left">
                    <Skeleton className="h-4 w-16" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(4)].map((_, i) => (
                <tr key={i} className="border-b">
                  {[...Array(7)].map((_, j) => (
                    <td key={j} className="p-4">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Planned Disbursements Tab Skeleton
export function PlannedDisbursementsSkeleton() {
  return (
    <div className="space-y-4">
      {/* Table Skeleton */}
      <div className="rounded-md">
        <div className="p-4 border-b flex justify-between items-center">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-9 w-40 rounded" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                {['Period', 'Status', 'Provider → Receiver', 'Amount', 'Value Date', 'USD Value', 'Actions'].map((header, i) => (
                  <th key={i} className="p-4 text-left">
                    <Skeleton className="h-4 w-20" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(4)].map((_, i) => (
                <tr key={i} className="border-b">
                  {[...Array(7)].map((_, j) => (
                    <td key={j} className="p-4">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Financial Analytics Tab Skeleton
export function FinancialAnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      {/* First Card - Financial Overview */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-6 w-64 bg-gray-200" />
              <Skeleton className="h-4 w-96 bg-gray-100" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Toggle buttons */}
              <Skeleton className="h-8 w-32 bg-gray-100 rounded-lg" />
              <Skeleton className="h-8 w-36 bg-gray-100 rounded-lg" />
              {/* Chart type buttons */}
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-20 bg-gray-100 rounded" />
                ))}
              </div>
              {/* Export buttons */}
              <div className="flex gap-1">
                <Skeleton className="h-8 w-8 bg-gray-100 rounded" />
                <Skeleton className="h-8 w-8 bg-gray-100 rounded" />
              </div>
            </div>
          </div>
        </div>
        <div className="p-6">
          {/* Chart area */}
          <Skeleton className="h-[500px] w-full bg-gray-50 rounded" />
        </div>
      </div>

      {/* Second Card - Budget vs Actual */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-6 w-72 bg-gray-200" />
              <Skeleton className="h-4 w-80 bg-gray-100" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Toggle buttons */}
              <Skeleton className="h-8 w-32 bg-gray-100 rounded-lg" />
              {/* Chart type buttons */}
              <div className="flex gap-1">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-20 bg-gray-100 rounded" />
                ))}
              </div>
              {/* Export buttons */}
              <div className="flex gap-1">
                <Skeleton className="h-8 w-8 bg-gray-100 rounded" />
                <Skeleton className="h-8 w-8 bg-gray-100 rounded" />
              </div>
            </div>
          </div>
        </div>
        <div className="p-6">
          {/* Chart area */}
          <Skeleton className="h-[400px] w-full bg-gray-50 rounded" />
        </div>
      </div>

      {/* Third Card - Funding Source Breakdown */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-6 w-56 bg-gray-200" />
              <Skeleton className="h-4 w-64 bg-gray-100" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Chart/Table toggle */}
              <Skeleton className="h-8 w-24 bg-gray-100 rounded-lg" />
              {/* Export buttons */}
              <div className="flex gap-1">
                <Skeleton className="h-8 w-8 bg-gray-100 rounded" />
                <Skeleton className="h-8 w-8 bg-gray-100 rounded" />
              </div>
            </div>
          </div>
        </div>
        <div className="p-6">
          {/* Chart/Sankey area */}
          <Skeleton className="h-[500px] w-full bg-gray-50 rounded" />
        </div>
      </div>
    </div>
  );
} 