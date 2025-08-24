import React from 'react'
import { Skeleton } from '@/components/ui/skeleton-loader'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Analytics Dashboard Skeleton
export function AnalyticsDashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50" aria-busy="true" aria-label="Loading analytics dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Skeleton variant="text" width="250px" height="2rem" className="mb-2" />
          <Skeleton variant="text" width="400px" height="1rem" />
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <Skeleton variant="rounded" width="150px" height="40px" />
            <Skeleton variant="rounded" width="150px" height="40px" />
            <Skeleton variant="rounded" width="150px" height="40px" />
            <Skeleton variant="rounded" width="120px" height="40px" />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Skeleton variant="circular" width="40px" height="40px" />
                  <Skeleton variant="text" width="60px" height="0.75rem" />
                </div>
                <Skeleton variant="text" width="120px" height="2rem" className="mb-2" />
                <Skeleton variant="text" width="100px" height="0.875rem" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Skeleton variant="text" width="200px" height="1.5rem" />
                  <Skeleton variant="rounded" width="100px" height="32px" />
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton variant="rectangular" width="100%" height="300px" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

// IATI XML Import Skeleton
export function IATIImportSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50" aria-busy="true" aria-label="Loading IATI import">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Skeleton variant="text" width="300px" height="2rem" className="mb-2" />
          <Skeleton variant="text" width="500px" height="1rem" />
        </div>

        {/* Progress Section */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton variant="text" width="150px" height="1.25rem" />
                <Skeleton variant="text" width="80px" height="1rem" />
              </div>
              <Skeleton variant="rectangular" width="100%" height="8px" className="rounded-full" />
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="text-center">
                  <Skeleton variant="circular" width="40px" height="40px" className="mx-auto mb-2" />
                  <Skeleton variant="text" width="80px" height="0.875rem" className="mx-auto" />
                </div>
                <div className="text-center">
                  <Skeleton variant="circular" width="40px" height="40px" className="mx-auto mb-2" />
                  <Skeleton variant="text" width="80px" height="0.875rem" className="mx-auto" />
                </div>
                <div className="text-center">
                  <Skeleton variant="circular" width="40px" height="40px" className="mx-auto mb-2" />
                  <Skeleton variant="text" width="80px" height="0.875rem" className="mx-auto" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Validation Results */}
        <Card>
          <CardHeader>
            <Skeleton variant="text" width="200px" height="1.5rem" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="border-l-4 border-gray-200 pl-4 py-2">
                  <Skeleton variant="text" width="60%" height="1rem" className="mb-1" />
                  <Skeleton variant="text" width="80%" height="0.875rem" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Transactions List Skeleton
export function TransactionsListSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50" aria-busy="true" aria-label="Loading transactions">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Skeleton variant="text" width="250px" height="2rem" className="mb-2" />
            <Skeleton variant="text" width="400px" height="1rem" />
          </div>
          <Skeleton variant="rounded" width="140px" height="40px" />
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <Skeleton variant="rounded" width="200px" height="40px" />
              <Skeleton variant="rounded" width="150px" height="40px" />
              <Skeleton variant="rounded" width="150px" height="40px" />
              <Skeleton variant="rounded" width="120px" height="40px" />
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton variant="text" width="100px" height="0.875rem" className="mb-2" />
                <Skeleton variant="text" width="150px" height="1.5rem" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Activity', 'Date', 'Type', 'Status', 'Provider → Receiver', 'Value', 'Aid Type', 'Flow Type', 'Finance Type', 'Actions'].map((header) => (
                    <th key={header} className="px-4 py-3 text-left">
                      <Skeleton variant="text" width="80px" height="0.875rem" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <tr key={i}>
                    <td className="px-4 py-3">
                      <Skeleton variant="text" width="200px" height="0.875rem" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton variant="text" width="100px" height="0.875rem" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton variant="text" width="80px" height="0.875rem" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton variant="circular" width="24px" height="24px" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton variant="text" width="180px" height="0.875rem" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton variant="text" width="100px" height="0.875rem" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton variant="text" width="80px" height="0.875rem" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton variant="text" width="80px" height="0.875rem" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton variant="text" width="80px" height="0.875rem" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Skeleton variant="circular" width="32px" height="32px" />
                        <Skeleton variant="circular" width="32px" height="32px" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}

// Partner Funding Summary Skeleton
export function PartnerFundingSummarySkeleton() {
  return (
    <div className="min-h-screen bg-gray-50" aria-busy="true" aria-label="Loading partner funding summary">
      <div className="max-w-screen-2xl mx-auto px-6 py-4 space-y-6">
        {/* Header */}
        <div className="mb-6">
          <Skeleton variant="text" width="250px" height="2rem" className="mb-2" />
        </div>

        {/* Metrics Cards - Static, don't change between tabs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            'Bilateral Partners',
            'Multilateral Organisations', 
            'Other Partners',
            'Custom Groups'
          ].map((title, i) => (
            <Card key={i} className="bg-white border border-gray-200">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Skeleton variant="text" width="140px" height="0.875rem" />
                  <Skeleton variant="circular" width="16px" height="16px" />
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton variant="text" width="60px" height="2rem" className="mb-1" />
                <Skeleton variant="text" width="80px" height="0.75rem" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content with Tabs */}
        <Tabs defaultValue="type">
          <div className="flex items-center justify-between mb-6">
            {/* Tab Navigation */}
            <TabsList className="grid w-auto grid-cols-2">
              <TabsTrigger value="type" className="flex items-center gap-2">
                <Skeleton variant="circular" width="16px" height="16px" />
                <Skeleton variant="text" width="140px" height="1rem" />
              </TabsTrigger>
              <TabsTrigger value="custom" className="flex items-center gap-2">
                <Skeleton variant="circular" width="16px" height="16px" />
                <Skeleton variant="text" width="120px" height="1rem" />
              </TabsTrigger>
            </TabsList>

            {/* Controls */}
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="relative">
                <Skeleton variant="circular" width="16px" height="16px" className="absolute left-3 top-1/2 transform -translate-y-1/2" />
                <Skeleton variant="rounded" width="256px" height="40px" />
              </div>

              {/* Transaction Type Toggle */}
              <div className="flex items-center bg-white border border-gray-200 rounded-md">
                <Skeleton variant="rounded" width="110px" height="32px" className="mr-1" />
                <Skeleton variant="rounded" width="110px" height="32px" />
              </div>

              {/* Action Buttons */}
              <Skeleton variant="rounded" width="90px" height="32px" />
              <Skeleton variant="rounded" width="100px" height="32px" />
            </div>
          </div>

          {/* Tab Content */}
          <TabsContent value="type" className="space-y-4">
            {/* Group Cards */}
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-white border border-gray-200">
                <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton variant="circular" width="16px" height="16px" />
                      <div>
                        <Skeleton variant="text" width="180px" height="1.125rem" className="mb-1" />
                        <Skeleton variant="text" width="220px" height="0.875rem" />
                      </div>
                    </div>
                    <Skeleton variant="rounded" width="120px" height="24px" />
                  </div>
                </CardHeader>
                
                {/* Expanded Content */}
                <CardContent className="pt-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-2">
                            <Skeleton variant="text" width="140px" height="0.875rem" />
                          </th>
                          <th className="text-center py-3 px-2">
                            <Skeleton variant="text" width="100px" height="0.875rem" />
                          </th>
                          {['2022', '2023', '2024', '2025', '2026', '2027'].map((year) => (
                            <th key={year} className="text-center py-3 px-2">
                              <Skeleton variant="text" width="80px" height="0.875rem" />
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[1, 2, 3, 4].map((j) => (
                          <tr key={j} className="border-b border-gray-200 hover:bg-blue-50 bg-gray-50">
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-2">
                                <Skeleton variant="circular" width="16px" height="16px" />
                                <Skeleton variant="text" width="200px" height="0.875rem" />
                              </div>
                            </td>
                            <td className="py-3 px-2 text-center">
                              <Skeleton variant="text" width="40px" height="0.875rem" />
                            </td>
                            {[1, 2, 3, 4, 5, 6].map((k) => (
                              <td key={k} className="py-3 px-2 text-center">
                                <Skeleton variant="text" width="60px" height="0.875rem" />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            {/* Custom Groups or Empty State */}
            <Card className="bg-white border border-gray-200">
              <CardContent className="py-12 text-center">
                <Skeleton variant="circular" width="48px" height="48px" className="mx-auto mb-4" />
                <Skeleton variant="text" width="200px" height="1.125rem" className="mx-auto mb-2" />
                <Skeleton variant="text" width="300px" height="0.875rem" className="mx-auto mb-4" />
                <Skeleton variant="rounded" width="140px" height="40px" className="mx-auto" />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// Rolodex (Organization Directory) Skeleton
export function RolodexSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50" aria-busy="true" aria-label="Loading organization directory">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Skeleton variant="text" width="250px" height="2rem" className="mb-2" />
          <Skeleton variant="text" width="400px" height="1rem" />
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <Skeleton variant="rounded" width="300px" height="40px" />
            <Skeleton variant="rounded" width="150px" height="40px" />
            <Skeleton variant="rounded" width="150px" height="40px" />
            <Skeleton variant="rounded" width="150px" height="40px" />
          </div>
        </div>

        {/* Organization Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <Card key={i} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <Skeleton variant="rounded" width="64px" height="64px" />
                  <div className="flex-1">
                    <Skeleton variant="text" width="80%" height="1.25rem" className="mb-2" />
                    <Skeleton variant="text" width="60%" height="0.875rem" />
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Skeleton variant="circular" width="16px" height="16px" />
                    <Skeleton variant="text" width="150px" height="0.875rem" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton variant="circular" width="16px" height="16px" />
                    <Skeleton variant="text" width="120px" height="0.875rem" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Skeleton variant="rounded" width="60px" height="24px" />
                  <Skeleton variant="rounded" width="80px" height="24px" />
                  <Skeleton variant="rounded" width="70px" height="24px" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

// User Management Panel Skeleton
export function UserManagementSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50" aria-busy="true" aria-label="Loading user management">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Skeleton variant="text" width="250px" height="2rem" className="mb-2" />
            <Skeleton variant="text" width="400px" height="1rem" />
          </div>
          <Skeleton variant="rounded" width="140px" height="40px" />
        </div>

        {/* Role Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Skeleton variant="text" width="80px" height="1rem" />
              <div className="flex gap-2">
                <Skeleton variant="rounded" width="80px" height="32px" />
                <Skeleton variant="rounded" width="100px" height="32px" />
                <Skeleton variant="rounded" width="90px" height="32px" />
                <Skeleton variant="rounded" width="70px" height="32px" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['User', 'Email', 'Role', 'Organization', 'Status', 'Last Active', 'Permissions', 'Actions'].map((header) => (
                    <th key={header} className="px-4 py-3 text-left">
                      <Skeleton variant="text" width="80px" height="0.875rem" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <tr key={i}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Skeleton variant="circular" width="40px" height="40px" />
                        <Skeleton variant="text" width="120px" height="0.875rem" />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton variant="text" width="180px" height="0.875rem" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton variant="rounded" width="80px" height="24px" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton variant="text" width="150px" height="0.875rem" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton variant="rounded" width="60px" height="24px" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton variant="text" width="100px" height="0.875rem" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Skeleton variant="rounded" width="24px" height="24px" />
                        <Skeleton variant="rounded" width="24px" height="24px" />
                        <Skeleton variant="rounded" width="24px" height="24px" />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Skeleton variant="circular" width="32px" height="32px" />
                        <Skeleton variant="circular" width="32px" height="32px" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
} 