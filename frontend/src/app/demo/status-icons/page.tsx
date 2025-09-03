"use client"

import React from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusIcon } from '@/components/ui/status-icon'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function StatusIconsDemoPage() {
  const submissionStatuses = ['draft', 'submitted', 'validated', 'rejected', 'published']
  const publicationStatuses = ['draft', 'published']
  const activityStatuses = ['planning', 'implementation', 'completed', 'cancelled', 'suspended', '1', '2', '3', '4', '5', '6']

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Status Icons Demo</h1>
          <p className="text-muted-foreground mb-8">
            Preview the status icons used throughout the AIMS application for submission and publication statuses.
          </p>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* Submission Status Icons */}
            <Card>
              <CardHeader>
                <CardTitle>Submission Status Icons</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Icon</TableHead>
                      <TableHead>Tooltip</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissionStatuses.map((status) => (
                      <TableRow key={status}>
                        <TableCell className="font-medium capitalize">{status}</TableCell>
                        <TableCell>
                          <StatusIcon type="submission" status={status} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {status === 'draft' && 'Draft - In progress'}
                          {status === 'submitted' && 'Submitted - Awaiting validation'}
                          {status === 'validated' && 'Validated - Approved for publication'}
                          {status === 'rejected' && 'Rejected - Requires revision'}
                          {status === 'published' && 'Published - Publicly visible'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Publication Status Icons */}
            <Card>
              <CardHeader>
                <CardTitle>Publication Status Icons</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Icon</TableHead>
                      <TableHead>Tooltip</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {publicationStatuses.map((status) => (
                      <TableRow key={status}>
                        <TableCell className="font-medium capitalize">{status}</TableCell>
                        <TableCell>
                          <StatusIcon type="publication" status={status} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {status === 'draft' && 'Unpublished - Not published'}
                          {status === 'published' && 'Published - Publicly visible'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Activity Status Icons */}
            <Card>
              <CardHeader>
                <CardTitle>Activity Status Icons</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Icon</TableHead>
                      <TableHead>Tooltip</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activityStatuses.map((status) => (
                      <TableRow key={status}>
                        <TableCell className="font-medium">
                          {status === '1' ? 'Pipeline' :
                           status === '2' ? 'Implementation' :
                           status === '3' ? 'Finalisation' :
                           status === '4' ? 'Closed' :
                           status === '5' ? 'Cancelled' :
                           status === '6' ? 'Suspended' :
                           status.charAt(0).toUpperCase() + status.slice(1)}
                        </TableCell>
                        <TableCell>
                          <StatusIcon type="activity" status={status} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {status === 'planning' && 'Planning - Activity in planning phase'}
                          {status === 'implementation' && 'Implementation - Activity being implemented'}
                          {status === 'completed' && 'Completed - Activity completed successfully'}
                          {status === 'cancelled' && 'Cancelled - Activity cancelled'}
                          {status === 'suspended' && 'Suspended - Activity temporarily suspended'}
                          {status === '1' && 'Pipeline - Activity in pipeline'}
                          {status === '2' && 'Implementation - Activity being implemented'}
                          {status === '3' && 'Finalisation - Activity in final phase'}
                          {status === '4' && 'Closed - Activity closed'}
                          {status === '5' && 'Cancelled - Activity cancelled'}
                          {status === '6' && 'Suspended - Activity suspended'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Example Table */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Example: Activity Table with Status Icons</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Activity Title</TableHead>
                    <TableHead>Submission Status</TableHead>
                    <TableHead>Publication Status</TableHead>
                    <TableHead>Created Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Clean Water Initiative</TableCell>
                    <TableCell>
                      <StatusIcon type="submission" status="validated" />
                    </TableCell>
                    <TableCell>
                      <StatusIcon type="publication" status="published" />
                    </TableCell>
                    <TableCell>2024-01-15</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Education Support Program</TableCell>
                    <TableCell>
                      <StatusIcon type="submission" status="submitted" />
                    </TableCell>
                    <TableCell>
                      <StatusIcon type="publication" status="draft" />
                    </TableCell>
                    <TableCell>2024-01-20</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Healthcare Infrastructure</TableCell>
                    <TableCell>
                      <StatusIcon type="submission" status="rejected" />
                    </TableCell>
                    <TableCell>
                      <StatusIcon type="publication" status="draft" />
                    </TableCell>
                    <TableCell>2024-01-25</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Agriculture Development</TableCell>
                    <TableCell>
                      <StatusIcon type="submission" status="draft" />
                    </TableCell>
                    <TableCell>
                      <StatusIcon type="publication" status="draft" />
                    </TableCell>
                    <TableCell>2024-01-30</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Implementation Guide */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Implementation Guide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Usage:</h3>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
{`import { StatusIcon } from '@/components/ui/status-icon'

// Submission status icon
<StatusIcon type="submission" status="validated" />

// Publication status icon  
<StatusIcon type="publication" status="published" />

// With custom className
<StatusIcon 
  type="submission" 
  status="rejected" 
  className="cursor-pointer hover:opacity-75" 
/>`}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Available Status Values:</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Submission Status:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• draft</li>
                      <li>• submitted</li>
                      <li>• validated</li>
                      <li>• rejected</li>
                      <li>• published</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-2">Publication Status:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• draft</li>
                      <li>• published</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Benefits:</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Space-efficient - Icons take less space than text badges</li>
                  <li>• Consistent visual language across the application</li>
                  <li>• Hover tooltips provide clear status descriptions</li>
                  <li>• Black color scheme maintains readability</li>
                  <li>• Accessible with proper ARIA attributes</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}