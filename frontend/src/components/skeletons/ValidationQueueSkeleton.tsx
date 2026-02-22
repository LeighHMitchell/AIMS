import React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton-loader'

export function ValidationQueueSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50" aria-busy="true" aria-label="Loading validation queue">
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Skeleton variant="text" width="300px" height="2rem" className="mb-2" />
          <Skeleton variant="text" width="400px" height="1rem" />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Skeleton variant="text" width="120px" height="0.875rem" />
                  <Skeleton variant="circular" width="24px" height="24px" />
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton variant="text" width="48px" height="2rem" className="mb-1" />
                <Skeleton variant="text" width="100px" height="0.75rem" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter and Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Skeleton variant="rounded" height="40px" className="w-full" />
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} variant="rounded" width="80px" height="36px" />
            ))}
          </div>
        </div>

        {/* Activities List */}
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="bg-white">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Skeleton variant="text" width="40%" height="1.25rem" />
                      <Skeleton variant="rounded" width="80px" height="24px" />
                    </div>
                    
                    <Skeleton variant="text" width="70%" height="0.875rem" className="mb-3" />
                    
                    <div className="flex items-center gap-4">
                      <Skeleton variant="text" width="120px" height="0.875rem" />
                      <Skeleton variant="text" width="140px" height="0.875rem" />
                      <Skeleton variant="text" width="100px" height="0.875rem" />
                      <Skeleton variant="text" width="40px" height="0.875rem" />
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Skeleton variant="rounded" width="90px" height="32px" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

// Table variant for validation queue
export function ValidationTableSkeleton() {
  return (
    <Card className="bg-white">
      <CardContent className="p-0">
        <table className="w-full">
          <thead className="bg-surface-muted border-b">
            <tr>
              <th className="text-left p-4">
                <Skeleton variant="text" width="100px" height="0.875rem" />
              </th>
              <th className="text-left p-4">
                <Skeleton variant="text" width="80px" height="0.875rem" />
              </th>
              <th className="text-left p-4">
                <Skeleton variant="text" width="120px" height="0.875rem" />
              </th>
              <th className="text-left p-4">
                <Skeleton variant="text" width="100px" height="0.875rem" />
              </th>
              <th className="text-left p-4">
                <Skeleton variant="text" width="80px" height="0.875rem" />
              </th>
              <th className="text-left p-4">
                <Skeleton variant="text" width="60px" height="0.875rem" />
              </th>
              <th className="text-right p-4">
                <Skeleton variant="text" width="80px" height="0.875rem" />
              </th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <tr key={i} className="border-b hover:bg-muted/50 transition-colors">
                <td className="p-4">
                  <Skeleton variant="text" width="200px" height="1rem" className="mb-1" />
                  <Skeleton variant="text" width="150px" height="0.75rem" />
                </td>
                <td className="p-4">
                  <Skeleton variant="rounded" width="70px" height="22px" />
                </td>
                <td className="p-4">
                  <Skeleton variant="text" width="120px" height="0.875rem" />
                </td>
                <td className="p-4">
                  <Skeleton variant="text" width="100px" height="0.875rem" />
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <Skeleton variant="circular" width="16px" height="16px" />
                    <Skeleton variant="text" width="50px" height="0.875rem" />
                  </div>
                </td>
                <td className="p-4">
                  <Skeleton variant="text" width="30px" height="0.875rem" />
                </td>
                <td className="p-4 text-right">
                  <div className="flex gap-2 justify-end">
                    <Skeleton variant="rounded" width="70px" height="28px" />
                    <Skeleton variant="rounded" width="70px" height="28px" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

// Batch action skeleton for validation queue
export function ValidationBatchActionsSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton variant="rounded" width="20px" height="20px" />
          <Skeleton variant="text" width="150px" height="0.875rem" />
        </div>
        <div className="flex gap-2">
          <Skeleton variant="rounded" width="100px" height="36px" />
          <Skeleton variant="rounded" width="100px" height="36px" />
        </div>
      </div>
    </div>
  )
}