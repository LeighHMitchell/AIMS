import React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton-loader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function ActivityProfileSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50" aria-busy="true" aria-label="Loading activity profile">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section with Banner */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
          {/* Banner placeholder */}
          <Skeleton variant="rectangular" height="192px" className="w-full" />
          
          {/* Header Content */}
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-start gap-4 mb-6">
                  {/* Icon placeholder */}
                  <Skeleton variant="rounded" width="64px" height="64px" />
                  <div className="flex-1">
                    {/* Title placeholder */}
                    <Skeleton variant="text" width="60%" height="2rem" className="mb-2" />
                  </div>
                </div>
                
                {/* Metadata Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 divide-x divide-gray-100">
                  {/* Identifiers Section */}
                  <div className="space-y-3">
                    <Skeleton variant="text" width="150px" height="1rem" className="mb-2" />
                    <div className="space-y-2">
                      <Skeleton variant="text" width="180px" height="0.875rem" />
                      <Skeleton variant="text" width="200px" height="0.875rem" />
                    </div>
                  </div>

                  {/* Status & Dates Section */}
                  <div className="space-y-3 pl-8">
                    <Skeleton variant="text" width="150px" height="1rem" className="mb-2" />
                    <div className="space-y-2">
                      <Skeleton variant="rounded" width="100px" height="28px" />
                      <Skeleton variant="text" width="160px" height="0.875rem" />
                      <Skeleton variant="text" width="140px" height="0.875rem" />
                    </div>
                  </div>

                  {/* Organization Section */}
                  <div className="space-y-3 pl-8">
                    <Skeleton variant="text" width="150px" height="1rem" className="mb-2" />
                    <div className="space-y-2">
                      <Skeleton variant="text" width="180px" height="0.875rem" />
                      <Skeleton variant="text" width="150px" height="0.875rem" />
                      <Skeleton variant="text" width="120px" height="0.875rem" />
                    </div>
                  </div>
                </div>

                {/* Contributors pills */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <Skeleton variant="text" width="150px" height="0.875rem" className="mb-3" />
                  <div className="flex flex-wrap gap-2">
                    <Skeleton variant="rounded" width="80px" height="24px" />
                    <Skeleton variant="rounded" width="100px" height="24px" />
                    <Skeleton variant="rounded" width="90px" height="24px" />
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2 ml-6">
                <Skeleton variant="rounded" width="120px" height="36px" />
                <Skeleton variant="rounded" width="40px" height="36px" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content with Tabs */}
        <Tabs defaultValue="about" className="space-y-4">
          <TabsList className="grid w-full grid-cols-10">
            <TabsTrigger value="about" disabled>About</TabsTrigger>
            <TabsTrigger value="sectors" disabled>Sectors</TabsTrigger>
            <TabsTrigger value="contributors" disabled>Contributors</TabsTrigger>
            <TabsTrigger value="sdg" disabled>SDG</TabsTrigger>
            <TabsTrigger value="organisations" disabled>Organisations</TabsTrigger>
            <TabsTrigger value="locations" disabled>Locations</TabsTrigger>
            <TabsTrigger value="finances" disabled>Finances</TabsTrigger>
            <TabsTrigger value="transactions" disabled>Transactions</TabsTrigger>
            <TabsTrigger value="results" disabled>Results</TabsTrigger>
            <TabsTrigger value="comments" disabled>Comments</TabsTrigger>
          </TabsList>

          <TabsContent value="about" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              {/* Sectors Card */}
              <Card>
                <CardHeader className="pb-3">
                  <Skeleton variant="text" width="100px" height="1rem" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Skeleton variant="text" width="90%" height="0.875rem" />
                    <Skeleton variant="text" width="70%" height="0.875rem" />
                    <Skeleton variant="text" width="80%" height="0.875rem" />
                  </div>
                </CardContent>
              </Card>

              {/* Partners Cards */}
              {[1, 2].map((i) => (
                <Card key={i}>
                  <CardHeader className="pb-3">
                    <Skeleton variant="text" width="140px" height="1rem" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Skeleton variant="text" width="85%" height="0.875rem" />
                      <Skeleton variant="text" width="60%" height="0.875rem" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Activity Description */}
            <Card>
              <CardHeader>
                <Skeleton variant="text" width="180px" height="1.25rem" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton variant="text" width="100%" height="1rem" />
                  <Skeleton variant="text" width="95%" height="1rem" />
                  <Skeleton variant="text" width="75%" height="1rem" />
                </div>
                <div className="mt-4 space-y-2">
                  <Skeleton variant="text" width="120px" height="1rem" className="font-medium" />
                  <Skeleton variant="text" width="100%" height="1rem" />
                  <Skeleton variant="text" width="85%" height="1rem" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// Transaction table skeleton component
export function TransactionTableSkeleton() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2">
              <Skeleton variant="text" width="80px" height="0.875rem" />
            </th>
            <th className="text-left p-2">
              <Skeleton variant="text" width="100px" height="0.875rem" />
            </th>
            <th className="text-left p-2">
              <Skeleton variant="text" width="80px" height="0.875rem" />
            </th>
            <th className="text-left p-2">
              <Skeleton variant="text" width="80px" height="0.875rem" />
            </th>
            <th className="text-left p-2">
              <Skeleton variant="text" width="60px" height="0.875rem" />
            </th>
            <th className="text-left p-2">
              <Skeleton variant="text" width="60px" height="0.875rem" />
            </th>
            <th className="text-right p-2">
              <Skeleton variant="text" width="80px" height="0.875rem" />
            </th>
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3, 4].map((i) => (
            <tr key={i} className="border-b">
              <td className="p-2">
                <Skeleton variant="text" width="100px" height="0.875rem" />
              </td>
              <td className="p-2">
                <Skeleton variant="text" width="120px" height="0.875rem" />
              </td>
              <td className="p-2">
                <Skeleton variant="text" width="90px" height="0.875rem" />
              </td>
              <td className="p-2">
                <Skeleton variant="text" width="90px" height="0.875rem" />
              </td>
              <td className="p-2">
                <Skeleton variant="text" width="80px" height="0.875rem" />
              </td>
              <td className="p-2">
                <Skeleton variant="text" width="70px" height="0.875rem" />
              </td>
              <td className="text-right p-2">
                <Skeleton variant="text" width="100px" height="0.875rem" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}